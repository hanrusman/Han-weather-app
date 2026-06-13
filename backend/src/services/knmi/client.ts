/**
 * Shared low-level HTTP client for KNMI APIs.
 *
 * KNMI Data Platform uses the API key as the raw `Authorization` header value
 * (no "Bearer" prefix). Each function returns null on auth/network failure
 * rather than throwing — callers degrade gracefully to "no data".
 */

const DEFAULT_TIMEOUT_MS = 8_000;

export type KnmiFetchResult<T> = {
  data: T | null;
  /** 'ok' | 'no-key' | 'unauthorized' | 'not-found' | 'error' */
  status: 'ok' | 'no-key' | 'unauthorized' | 'not-found' | 'error';
  message?: string;
};

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms)),
  ]);
}

/** Generic JSON-returning GET helper. */
export async function knmiGetJson<T>(
  url: string,
  apiKey: string,
  opts: { timeoutMs?: number; logLabel?: string } = {},
): Promise<KnmiFetchResult<T>> {
  if (!apiKey) {
    return { data: null, status: 'no-key', message: 'KNMI API key not configured' };
  }
  try {
    const res = await withTimeout(
      fetch(url, {
        headers: { Authorization: apiKey, Accept: 'application/json' },
      }),
      opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
    if (res.status === 401 || res.status === 403) {
      console.warn(`KNMI ${opts.logLabel ?? 'request'}: ${res.status} ${res.statusText}`);
      return { data: null, status: 'unauthorized', message: `${res.status} ${res.statusText}` };
    }
    if (res.status === 404) return { data: null, status: 'not-found' };
    if (!res.ok) {
      return { data: null, status: 'error', message: `${res.status} ${res.statusText}` };
    }
    const data = (await res.json()) as T;
    return { data, status: 'ok' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`KNMI ${opts.logLabel ?? 'request'} failed:`, msg);
    return { data: null, status: 'error', message: msg };
  }
}

/** Generic text/XML GET helper. */
export async function knmiGetText(
  url: string,
  apiKey: string,
  opts: { timeoutMs?: number; logLabel?: string; auth?: boolean } = {},
): Promise<KnmiFetchResult<string>> {
  const requiresAuth = opts.auth !== false;
  if (requiresAuth && !apiKey) {
    return { data: null, status: 'no-key', message: 'KNMI API key not configured' };
  }
  try {
    const res = await withTimeout(
      fetch(url, requiresAuth ? { headers: { Authorization: apiKey } } : undefined),
      opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
    if (res.status === 401 || res.status === 403) {
      console.warn(`KNMI ${opts.logLabel ?? 'request'}: ${res.status} ${res.statusText}`);
      return { data: null, status: 'unauthorized', message: `${res.status} ${res.statusText}` };
    }
    if (res.status === 404) return { data: null, status: 'not-found' };
    if (!res.ok) {
      return { data: null, status: 'error', message: `${res.status} ${res.statusText}` };
    }
    const text = await res.text();
    return { data: text, status: 'ok' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`KNMI ${opts.logLabel ?? 'request'} failed:`, msg);
    return { data: null, status: 'error', message: msg };
  }
}

/** Great-circle distance in km between two lat/lon points. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
