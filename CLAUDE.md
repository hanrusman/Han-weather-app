# NL Weather Dashboard

Self-hosted weather dashboard for the Netherlands showing 5 weather models side-by-side, rain radar, KNMI warnings, and Stookwijzer status. Designed for Home Assistant iframe embedding.

## Architecture

Monorepo with two packages:

```
weather-app/
├── backend/          Express + TypeScript API (port 3100)
├── frontend/         React + Vite + TailwindCSS SPA (port 5173 dev)
├── Dockerfile        Multi-stage build (frontend → backend → production)
└── docker-compose.yml
```

### Backend (`backend/`)

Express server that proxies and caches external API data.

- **Entry:** `src/index.ts` — Express app, route mounting, HA alert scheduling
- **Config:** `src/config.ts` — All env vars, model list, cache TTLs
- **Cache:** `src/cache.ts` — Simple in-memory TTL cache (`MemoryCache` class)
- **Services:**
  - `services/openmeteo.ts` — Fetches 5 models from Open-Meteo API (forecast + current weather derived from forecast)
  - `services/knmi.ts` — KNMI Data Platform warnings (requires `KNMI_API_KEY`), radar URLs
  - `services/stookwijzer.ts` — Stookwijzer.nu API (fire/air quality advice)
  - `services/alerts.ts` — HA webhook alerts: tracks state changes for KNMI warnings, Stookwijzer, and significant weather codes
- **Routes:** `routes/forecast.ts`, `current.ts`, `warnings.ts`, `stookwijzer.ts`, `radar.ts` — All accept optional `?lat=&lon=` query params, fallback to config defaults

### Frontend (`frontend/`)

React 18 SPA with Recharts for data visualization.

- **Entry:** `src/main.tsx` → `src/App.tsx`
- **Types:** `src/types/weather.ts` — All shared TypeScript interfaces (`ModelId`, `HourlyData`, `MultiModelForecast`, `SavedLocation`, etc.)
- **Hooks:**
  - `hooks/useWeatherData.ts` — `useForecast(days, lat?, lon?)`, `useCurrentWeather(lat?, lon?)`, `useWarnings()`, `useStookwijzer(lat?, lon?)`, `useAppConfig()` — all with 5-min polling
  - `hooks/useLocations.ts` — localStorage CRUD for saved locations, GPS support, selected location state
  - `hooks/useModelToggle.ts` — Toggle weather models on/off in charts
- **Components:**
  - `components/MultiModelChart.tsx` — Main chart (Recharts): temperature, feels-like, precipitation %, wind (bft). Time ranges: 24h/3d/7d
  - `components/CurrentWeather.tsx` — Current conditions from all models
  - `components/DailyForecast.tsx` — 7-day strip with model spread bars
  - `components/RadarMap.tsx` — Buienradar iframe embed (dynamic lat/lon)
  - `components/Warnings.tsx` — KNMI weather warnings panel
  - `components/StookwijzerBadge.tsx` — Color-coded stookwijzer status badge
  - `components/LocationPicker.tsx` — Dropdown with search (Open-Meteo geocoding), GPS, saved locations
  - `components/ModelLegend.tsx` — Clickable model toggle legend
- **Utils:**
  - `utils/colors.ts` — Model colors, labels, stookwijzer/warning color maps
  - `utils/formatting.ts` — Temperature, wind (Beaufort), precipitation, date/time formatters
  - `utils/weatherCodes.ts` — WMO codes → Dutch descriptions + emoji icons
  - `utils/geocoding.ts` — Open-Meteo geocoding API client (NL-only)

## Weather Models

| ID | Label | Color |
|----|-------|-------|
| `knmi_seamless` | KNMI HARMONIE | `#FF6B00` (orange) |
| `ecmwf_ifs025` | ECMWF IFS | `#2563EB` (blue) |
| `icon_seamless` | DWD ICON | `#DC2626` (red) |
| `gfs_seamless` | NOAA GFS | `#7C3AED` (purple) |
| `meteofrance_seamless` | Météo-France | `#06B6D4` (cyan) |

## External APIs

- **Open-Meteo Forecast:** `api.open-meteo.com/v1/forecast` — Hourly data per model (no key needed)
- **Open-Meteo Geocoding:** `geocoding-api.open-meteo.com/v1/search` — Location search (NL filter, Dutch language)
- **KNMI Data Platform:** `api.dataplatform.knmi.nl` — Weather warnings (needs `KNMI_API_KEY`)
- **Stookwijzer:** `stookwijzer.nu/api/forecast` — Fire/air quality advice (no key needed)
- **Buienradar:** `gadgets.buienradar.nl/gadget/zoommap/` — Rain radar iframe widget

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3100` | Backend server port |
| `LATITUDE` | `52.37` | Default latitude (Amsterdam) |
| `LONGITUDE` | `4.89` | Default longitude (Amsterdam) |
| `LOCATION_NAME` | `Amsterdam` | Default location display name |
| `PROVINCE` | `Noord-Holland` | Province for KNMI warnings |
| `KNMI_API_KEY` | _(empty)_ | KNMI Data Platform API key (optional) |
| `HA_WEBHOOK_URL` | _(empty)_ | Home Assistant webhook URL for alerts (optional) |

## Development

```bash
# Backend
cd backend && npm install && npm run dev    # tsx watch on :3100

# Frontend
cd frontend && npm install && npm run dev   # Vite on :5173, proxies /api → :3100
```

## Build & Deploy

```bash
docker compose up --build    # Multi-stage: frontend build → backend build → node production
```

Production serves the Vite-built frontend as static files from the Express backend on port 3100.

## Key Patterns

- **Multi-location:** Locations stored in localStorage (`nl-weather-locations` key). Selected location ID in `nl-weather-selected-location`. Falls back to server config when no locations saved.
- **Caching:** All external API responses cached in-memory with configurable TTLs (5-30 min). Cache key includes lat/lon for location-specific data.
- **Polling:** Frontend hooks poll every 5 minutes via `setInterval`.
- **HA Alerts:** Module-level state tracking in `alerts.ts`. First check after restart sets baseline (no spurious alerts). Checks run every 5 min when `HA_WEBHOOK_URL` is configured.
- **Wind:** Displayed in Beaufort scale with km/h in parentheses.
- **Precipitation:** Shown as probability percentage (neerslagkans), not mm/h.
- **Chart variables:** Temperature, Feels-like temperature, Precipitation chance (%), Wind (bft).

## Language

UI text is in Dutch (NL). Code, comments, and documentation in English.

## TypeScript

Both packages use strict TypeScript. Run `npx tsc --noEmit` in each package to verify. External API responses use explicit `as` type assertions.
