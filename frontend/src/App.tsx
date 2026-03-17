import { useAppConfig, useForecast, useCurrentWeather, useWarnings, useStookwijzer, useAirQuality } from './hooks/useWeatherData';
import { useLocations } from './hooks/useLocations';
import { useModelToggle } from './hooks/useModelToggle';
import { MultiModelChart } from './components/MultiModelChart';
import { DailyForecast } from './components/DailyForecast';
import { RadarMap } from './components/RadarMap';
import { Warnings } from './components/Warnings';
import { WeatherInsights } from './components/WeatherInsights';
import { ExternalLinks } from './components/ExternalLinks';
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

  const { data: forecast, loading: forecastLoading, error: forecastError } = useForecast(14, lat, lon);
  const { data: currentWeather, loading: currentLoading } = useCurrentWeather(lat, lon);
  const warnings = useWarnings();
  const stookwijzer = useStookwijzer(lat, lon);
  const airQuality = useAirQuality(lat, lon);
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
        <header className="flex items-center justify-between" style={{ marginBottom: 'var(--space-xl)' }}>
          <div>
            <LocationPicker
              locations={locations}
              selectedLocation={selectedLocation}
              onSelect={selectLocation}
              onAdd={addLocation}
              onRemove={removeLocation}
              onGps={updateGpsLocation}
              locationName={config?.locationName}
            />
            {selectedLocation && (
              <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)', marginTop: '2px' }}>
                {selectedLocation.latitude.toFixed(2)}°N, {selectedLocation.longitude.toFixed(2)}°E
              </p>
            )}
          </div>

          {forecast && (
            <span className="hidden sm:inline" style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>
              {formatDateTime(forecast.fetchedAt)}
            </span>
          )}
        </header>

        {forecastError && (
          <div className="card" style={{ marginBottom: 'var(--space-lg)', background: 'rgba(239, 68, 68, 0.06)', borderColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
            {forecastError}
          </div>
        )}

        {/* Insights — hero section */}
        <WeatherInsights
          forecast={forecast}
          currentWeather={currentWeather}
          stookwijzer={stookwijzer}
          warnings={warnings}
          airQuality={airQuality}
        />

        {/* Context row: radar + 7-day forecast */}
        <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 'var(--space-lg)', marginTop: 'var(--space-lg)' }}>
          <div>
            <RadarMap
              latitude={selectedLocation?.latitude ?? config?.latitude ?? 52.37}
              longitude={selectedLocation?.longitude ?? config?.longitude ?? 4.89}
            />
          </div>
          <div className="lg:col-span-2">
            {forecast && (
              <DailyForecast forecast={forecast} enabledModels={enabledModels} />
            )}
          </div>
        </div>

        {/* Deep dive: model charts */}
        {forecast && (
          <div style={{ marginTop: 'var(--space-lg)' }}>
            <MultiModelChart
              forecast={forecast}
              enabledModels={enabledModels}
              allModels={allModels}
              isEnabled={isEnabled}
              onToggle={toggle}
            />
          </div>
        )}

        {/* KNMI warnings detail */}
        {warnings && warnings.warnings.length > 0 && (
          <div style={{ marginTop: 'var(--space-lg)' }}>
            <Warnings data={warnings} />
          </div>
        )}

        {/* External links */}
        {selectedLocation && (
          <div style={{ marginTop: 'var(--space-lg)' }}>
            <ExternalLinks latitude={selectedLocation.latitude} longitude={selectedLocation.longitude} />
          </div>
        )}

        {/* Footer */}
        <footer className="text-center" style={{ marginTop: 'var(--space-2xl)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>
          Data: Open-Meteo (CC-BY-4.0) &middot; KNMI (CC-BY-4.0) &middot; Stookwijzer
        </footer>
      </div>
    </div>
  );
}
