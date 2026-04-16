import { useState, useRef, useEffect, useCallback } from 'react';
import type { SavedLocation, GeocodingResult } from '../types/weather';
import { searchLocations } from '../utils/geocoding';

interface LocationPickerProps {
  locations: SavedLocation[];
  selectedLocation: SavedLocation | null;
  onSelect: (id: string) => void;
  onAdd: (loc: Omit<SavedLocation, 'id'>) => void;
  onRemove: (id: string) => void;
  onGps: (lat: number, lon: number) => void;
  locationName?: string;
}

export function LocationPicker({
  locations,
  selectedLocation,
  onSelect,
  onAdd,
  onRemove,
  onGps,
  locationName,
}: LocationPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const res = await searchLocations(query);
      setResults(res);
      setSearching(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelectResult = useCallback(
    (result: GeocodingResult) => {
      onAdd({
        name: result.admin2 ? `${result.name}, ${result.admin2}` : result.name,
        latitude: result.latitude,
        longitude: result.longitude,
        province: result.admin1,
      });
      setQuery('');
      setResults([]);
      setOpen(false);
    },
    [onAdd]
  );

  const handleGps = useCallback(() => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onGps(pos.coords.latitude, pos.coords.longitude);
        setGpsLoading(false);
        setOpen(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setGpsLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, [onGps]);

  const displayName = selectedLocation?.name || locationName || 'Kies locatie';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Inline heading trigger — subtle, part of the header */}
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Locatie: ${displayName}. Klik om te wijzigen`}
        className="flex items-center"
        style={{
          gap: '6px',
          padding: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-bright)',
          fontSize: 'var(--text-xl)',
          fontWeight: 600,
          letterSpacing: '-0.01em',
          lineHeight: 1.2,
          transition: 'color var(--transition-fast)',
        }}
      >
        <span>{displayName}</span>
        {/* Small pencil/edit icon */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0.3, flexShrink: 0, marginTop: 2 }}
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 'var(--space-sm)',
            width: 320,
            maxWidth: 'calc(100vw - 32px)',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border-emphasis)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 16px 48px var(--color-tooltip-shadow)',
            zIndex: 50,
            overflow: 'hidden',
          }}
          ref={(el) => {
            if (el) {
              // Ensure dropdown doesn't go off-screen right
              const rect = el.getBoundingClientRect();
              if (rect.right > window.innerWidth - 8) {
                el.style.left = 'auto';
                el.style.right = '0';
              }
            }
          }}
        >
          {/* Search input */}
          <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid var(--color-border)' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoek locatie..."
              aria-label="Zoek locatie"
              autoFocus
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--color-surface-0)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
          </div>

          {/* GPS button */}
          {'geolocation' in navigator && (
            <button
              onClick={handleGps}
              disabled={gpsLoading}
              className="w-full flex items-center"
              style={{
                gap: 'var(--space-sm)',
                padding: '10px var(--space-md)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-accent)',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--color-border)',
                cursor: gpsLoading ? 'wait' : 'pointer',
                transition: 'background var(--transition-fast)',
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2M2 12h2m16 0h2m-3.05-6.95L17.5 6.5m-11 11L5.05 18.95M18.95 18.95 17.5 17.5m-11-11L5.05 5.05" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {gpsLoading ? 'Locatie bepalen...' : 'Huidige locatie'}
            </button>
          )}

          {/* Search results */}
          {searching && (
            <p style={{ padding: '8px var(--space-md)', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>
              Zoeken...
            </p>
          )}
          {results.length > 0 && (
            <div style={{ borderBottom: '1px solid var(--color-border)', maxHeight: 192, overflowY: 'auto' }}>
              <p style={{ padding: '6px var(--space-md)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)' }}>
                Zoekresultaten
              </p>
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleSelectResult(r)}
                  className="w-full text-left"
                  style={{
                    padding: '8px var(--space-md)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-secondary)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background var(--transition-fast)',
                  }}
                >
                  <span style={{ color: 'var(--color-text-primary)' }}>{r.name}</span>
                  {r.admin2 && <span style={{ color: 'var(--color-text-tertiary)', marginLeft: 4 }}>{r.admin2}</span>}
                  {r.admin1 && <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)', marginLeft: 8 }}>{r.admin1}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Saved locations */}
          {locations.length > 0 && (
            <div style={{ maxHeight: 192, overflowY: 'auto' }}>
              <p style={{ padding: '6px var(--space-md)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)' }}>
                Opgeslagen
              </p>
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  className="flex items-center justify-between"
                  style={{
                    padding: '8px var(--space-md)',
                    background: loc.id === selectedLocation?.id ? 'var(--color-surface-3)' : 'transparent',
                    transition: 'background var(--transition-fast)',
                  }}
                >
                  <button
                    onClick={() => { onSelect(loc.id); setOpen(false); }}
                    className="flex-1 text-left flex items-center"
                    style={{
                      gap: 'var(--space-sm)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-text-secondary)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {loc.isGps && (
                      <svg className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--color-accent)' }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <circle cx="12" cy="12" r="3" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2M2 12h2m16 0h2" />
                      </svg>
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc.name}</span>
                    {loc.id === selectedLocation?.id && (
                      <span style={{ color: 'var(--color-success)', fontSize: 'var(--text-xs)', marginLeft: 'auto', flexShrink: 0 }}>&#10003;</span>
                    )}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove(loc.id); }}
                    aria-label={`${loc.name} verwijderen`}
                    title="Verwijderen"
                    style={{
                      color: 'var(--color-text-tertiary)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 4,
                      marginLeft: 4,
                      flexShrink: 0,
                      transition: 'color var(--transition-fast)',
                    }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {locations.length === 0 && results.length === 0 && !searching && (
            <p style={{ padding: 'var(--space-md)', fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
              Zoek een locatie of gebruik GPS
            </p>
          )}
        </div>
      )}
    </div>
  );
}
