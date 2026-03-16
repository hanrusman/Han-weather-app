import { useAppConfig, useForecast, useCurrentWeather, useWarnings, useStookwijzer } from './hooks/useWeatherData';
import { useLocations } from './hooks/useLocations';
import { useModelToggle } from './hooks/useModelToggle';
import { MultiModelChart } from './components/MultiModelChart';
import { CurrentWeather } from './components/CurrentWeather';
import { DailyForecast } from './components/DailyForecast';
import { RadarMap } from './components/RadarMap';
import { Warnings } from './components/Warnings';
import { StookwijzerBadge } from './components/StookwijzerBadge';
import { LocationPicker } from './components/LocationPicker';
import { formatDateTime } from './utils/formatting';

export default function App() {
  const config = useAppConfig();
  const {
    locations,
    selectedLocation,
    addLocation,
    removeLocation,
    selectLocation,
    updateGpsLocation,
  } = useLocations(config);

  const lat = selectedLocation?.latitude;
  const lon = selectedLocation?.longitude;

  const { data: forecast, loading: forecastLoading, error: forecastError } = useForecast(7, lat, lon);
  const { data: currentWeather, loading: currentLoading } = useCurrentWeather(lat, lon);
  const warnings = useWarnings();
  const stookwijzer = useStookwijzer(lat, lon);
  const { enabledModels, toggle, isEnabled, allModels } = useModelToggle();

  if (forecastLoading && currentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-lg)' }}>
          Weerdata laden...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto" style={{ padding: 'var(--space-lg)' }}>
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between" style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
          <div>
            <h1 className="font-semibold" style={{ fontSize: 'var(--text-xl)', color: 'var(--color-text-bright)', letterSpacing: '-0.01em' }}>
              {selectedLocation?.name || config?.locationName || 'NL Weather'}
            </h1>
            {selectedLocation && (
              <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)', marginTop: '2px' }}>
                {selectedLocation.latitude.toFixed(2)}°N, {selectedLocation.longitude.toFixed(2)}°E
              </p>
            )}
          </div>

          <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
            <LocationPicker
              locations={locations}
              selectedLocation={selectedLocation}
              onSelect={selectLocation}
              onAdd={addLocation}
              onRemove={removeLocation}
              onGps={updateGpsLocation}
            />
            {stookwijzer && <StookwijzerBadge data={stookwijzer} />}
            {warnings && warnings.warnings.length > 0 && (
              <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', color: 'var(--color-warning)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-warning)', display: 'inline-block' }} />
                KNMI
              </span>
            )}
            {forecast && (
              <span className="hidden sm:inline" style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>
                {formatDateTime(forecast.fetchedAt)}
              </span>
            )}
          </div>
        </header>

        {forecastError && (
          <div className="card" style={{ marginBottom: 'var(--space-lg)', background: 'rgba(239, 68, 68, 0.06)', borderColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
            {forecastError}
          </div>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 'var(--space-lg)' }}>
          {/* Left — charts */}
          <div className="lg:col-span-2 flex flex-col" style={{ gap: 'var(--space-lg)' }}>
            {forecast && (
              <MultiModelChart
                forecast={forecast}
                enabledModels={enabledModels}
                allModels={allModels}
                isEnabled={isEnabled}
                onToggle={toggle}
              />
            )}
            {forecast && (
              <DailyForecast forecast={forecast} enabledModels={enabledModels} />
            )}
          </div>

          {/* Right — glanceable cards */}
          <div className="flex flex-col" style={{ gap: 'var(--space-lg)' }}>
            {currentWeather && (
              <CurrentWeather
                data={currentWeather}
                locationName={selectedLocation?.name || config?.locationName || 'Amsterdam'}
              />
            )}
            <RadarMap
              latitude={selectedLocation?.latitude ?? config?.latitude ?? 52.37}
              longitude={selectedLocation?.longitude ?? config?.longitude ?? 4.89}
            />
            {warnings && <Warnings data={warnings} />}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center" style={{ marginTop: 'var(--space-2xl)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>
          Data: Open-Meteo (CC-BY-4.0) &middot; KNMI (CC-BY-4.0) &middot; Stookwijzer
        </footer>
      </div>
    </div>
  );
}
