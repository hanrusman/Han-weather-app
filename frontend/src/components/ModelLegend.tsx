import type { ModelId } from '../types/weather';
import { MODEL_COLORS, MODEL_LABELS } from '../utils/colors';

interface ModelLegendProps {
  allModels: ModelId[];
  isEnabled: (model: ModelId) => boolean;
  onToggle: (model: ModelId) => void;
}

export function ModelLegend({ allModels, isEnabled, onToggle }: ModelLegendProps) {
  return (
    <div className="flex flex-wrap" style={{ gap: 'var(--space-xs)' }}>
      {allModels.map((model) => {
        const enabled = isEnabled(model);
        return (
          <button
            key={model}
            onClick={() => onToggle(model)}
            className="flex items-center"
            style={{
              gap: 6,
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-xs)',
              fontWeight: 500,
              transition: 'all var(--transition-fast)',
              background: enabled ? 'var(--color-surface-2)' : 'transparent',
              color: enabled ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              opacity: enabled ? 1 : 0.5,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 3,
                borderRadius: 2,
                backgroundColor: enabled ? MODEL_COLORS[model] : 'var(--color-text-tertiary)',
              }}
            />
            {MODEL_LABELS[model]}
          </button>
        );
      })}
    </div>
  );
}
