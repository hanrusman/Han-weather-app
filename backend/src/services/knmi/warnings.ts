/**
 * KNMI warnings via Open Data API.
 *
 * Flow:
 *  1. List files in dataset `weather_warnings` v1.0, take latest by filename.
 *  2. Resolve `temporaryDownloadUrl` for that file.
 *  3. Fetch the (public, no-auth) URL and parse the XML.
 *
 * KNMI publishes warnings as a CAP-like XML. We extract per-province events
 * with type/level/valid_from/valid_until/description and let the caller
 * filter to the configured province.
 */

import { XMLParser } from 'fast-xml-parser';
import { config } from '../../config';
import { cache } from '../../cache';
import { knmiGetJson, knmiGetText } from './client';

export type WarningLevel = 'green' | 'yellow' | 'orange' | 'red';

export interface Warning {
  type: string;
  level: WarningLevel;
  description: string;
  area: string;
  validFrom?: string;
  validUntil?: string;
}

export interface WarningsResponse {
  warnings: Warning[];
  imageUrl: string;
  fetchedAt: string;
  /** Diagnostic: 'ok' | 'no-key' | 'unauthorized' | 'error' | 'no-data' */
  source: 'ok' | 'no-key' | 'unauthorized' | 'error' | 'no-data';
}

const FALLBACK_IMAGE = 'https://cdn.knmi.nl/knmi/map/current/weather/warning/waarschuwing_land_0_new.gif';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  ignoreDeclaration: true,
  ignorePiTags: true,
  removeNSPrefix: true,
  parseTagValue: true,
});

/** Map KNMI color words to our 4-level scale. */
function normalizeLevel(raw: string | undefined): WarningLevel {
  const v = (raw || '').toLowerCase();
  if (v.includes('red') || v.includes('rood')) return 'red';
  if (v.includes('orange') || v.includes('oranje')) return 'orange';
  if (v.includes('yellow') || v.includes('geel')) return 'yellow';
  return 'green';
}

/** Walk an arbitrary parsed-XML tree and yield every nested object. */
function* walkObjects(node: unknown): Generator<Record<string, unknown>> {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) yield* walkObjects(child);
    return;
  }
  const obj = node as Record<string, unknown>;
  yield obj;
  for (const value of Object.values(obj)) yield* walkObjects(value);
}

/**
 * Pick the first defined string value out of candidate keys (case-insensitive).
 * Looks recursively into nested objects so we can find e.g. area.areaDesc when
 * the caller asked for "area".
 */
function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const found = findStringByKey(obj, key.toLowerCase(), 0);
    if (found) return found;
  }
  return undefined;
}

function findStringByKey(node: unknown, targetLc: string, depth: number): string | undefined {
  if (depth > 4) return undefined;
  if (node == null) return undefined;
  if (typeof node === 'string' && node.trim()) return node.trim();
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findStringByKey(child, targetLc, depth + 1);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof node !== 'object') return undefined;
  const obj = node as Record<string, unknown>;
  for (const k of Object.keys(obj)) {
    if (k.toLowerCase() === targetLc) {
      const v = obj[k];
      if (typeof v === 'string' && v.trim()) return v.trim();
      if (typeof v === 'number') return String(v);
      // Nested — recurse into it (handles area → areaDesc)
      const inner = findStringByKey(v, targetLc, depth + 1);
      if (inner) return inner;
      // Or fall through to first usable string inside the nested object
      const anyChildString = findFirstString(v, depth + 1);
      if (anyChildString) return anyChildString;
    }
  }
  return undefined;
}

function findFirstString(node: unknown, depth: number): string | undefined {
  if (depth > 4) return undefined;
  if (typeof node === 'string' && node.trim()) return node.trim();
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) {
    for (const child of node) {
      const r = findFirstString(child, depth + 1);
      if (r) return r;
    }
    return undefined;
  }
  if (node && typeof node === 'object') {
    for (const v of Object.values(node as Record<string, unknown>)) {
      const r = findFirstString(v, depth + 1);
      if (r) return r;
    }
  }
  return undefined;
}

/**
 * Parse the KNMI warning XML.
 *
 * The dataset's exact schema is not 100% stable (KNMI has migrated between CAP
 * and a custom format historically), so the parser is intentionally tolerant:
 * we walk every node looking for ones that look like a warning record (have a
 * level/severity and an area/region field).
 */
export function parseWarningsXml(xml: string): Warning[] {
  let parsed: unknown;
  try {
    parsed = xmlParser.parse(xml);
  } catch {
    return [];
  }

  const found: Warning[] = [];
  const seen = new Set<string>();

  for (const node of walkObjects(parsed)) {
    const levelRaw =
      pickString(node, ['level', 'severity', 'colorcode', 'color', 'code', 'kleur']);
    const area = pickString(node, ['area', 'areaDesc', 'region', 'province', 'provincie']);

    if (!levelRaw || !area) continue;

    const level = normalizeLevel(levelRaw);
    if (level === 'green') continue; // green = "no warning", skip

    const type = pickString(node, [
      'event',
      'type',
      'phenomenon',
      'category',
      'verschijnsel',
      'weersverschijnsel',
    ]) || 'weer';

    const description = pickString(node, [
      'description',
      'headline',
      'instruction',
      'omschrijving',
      'tekst',
    ]) || `${type} (${level})`;

    const validFrom = pickString(node, ['effective', 'onset', 'validFrom', 'startTime', 'start']);
    const validUntil = pickString(node, ['expires', 'validUntil', 'endTime', 'end']);

    const key = `${area}|${type}|${level}|${validFrom ?? ''}|${validUntil ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);

    found.push({ type, level, description, area, validFrom, validUntil });
  }

  return found;
}

interface FilesListResponse {
  files?: { filename: string }[];
}
interface FileUrlResponse {
  temporaryDownloadUrl?: string;
}

export async function fetchWarnings(): Promise<WarningsResponse> {
  const cacheKey = `warnings:${config.province}`;
  const cached = cache.get<WarningsResponse>(cacheKey);
  if (cached) return cached;

  const provinceLc = config.province.toLowerCase();
  const baseResp: WarningsResponse = {
    warnings: [],
    imageUrl: FALLBACK_IMAGE,
    fetchedAt: new Date().toISOString(),
    source: 'no-data',
  };

  // 1) List files
  const list = await knmiGetJson<FilesListResponse>(
    'https://api.dataplatform.knmi.nl/open-data/v1/datasets/waarschuwingen_nederland_48h/versions/1.0/files?maxKeys=10&orderBy=created&sorting=desc',
    config.knmiApiKey,
    { logLabel: 'warnings:list' },
  );

  if (list.status === 'no-key') {
    cache.set(cacheKey, { ...baseResp, source: 'no-key' }, 60_000);
    return { ...baseResp, source: 'no-key' };
  }
  if (list.status === 'unauthorized') {
    cache.set(cacheKey, { ...baseResp, source: 'unauthorized' }, 60_000);
    return { ...baseResp, source: 'unauthorized' };
  }
  if (!list.data?.files?.length) {
    cache.set(cacheKey, baseResp, config.cache.warningsTtl);
    return baseResp;
  }

  // 2) Resolve latest file URL — prefer .xml (we parse XML); skip .txt
  let xml: string | null = null;
  const xmlFiles = list.data.files.filter((f) => f.filename.endsWith('.xml'));
  const candidates = (xmlFiles.length ? xmlFiles : list.data.files).slice(0, 3);
  for (const file of candidates) {
    const fileUrl = await knmiGetJson<FileUrlResponse>(
      `https://api.dataplatform.knmi.nl/open-data/v1/datasets/waarschuwingen_nederland_48h/versions/1.0/files/${encodeURIComponent(file.filename)}/url`,
      config.knmiApiKey,
      { logLabel: 'warnings:fileUrl' },
    );
    const dl = fileUrl.data?.temporaryDownloadUrl;
    if (!dl) continue;
    // The download URL is a temporary signed S3 URL — no auth header
    const content = await knmiGetText(dl, '', { auth: false, logLabel: 'warnings:download' });
    if (content.data && content.data.length > 50) {
      xml = content.data;
      break;
    }
  }

  if (!xml) {
    cache.set(cacheKey, baseResp, config.cache.warningsTtl);
    return baseResp;
  }

  const all = parseWarningsXml(xml);
  const forProvince = all.filter(
    (w) => !provinceLc || w.area.toLowerCase().includes(provinceLc),
  );

  const result: WarningsResponse = {
    warnings: forProvince,
    imageUrl: FALLBACK_IMAGE,
    fetchedAt: new Date().toISOString(),
    source: 'ok',
  };
  cache.set(cacheKey, result, config.cache.warningsTtl);
  return result;
}
