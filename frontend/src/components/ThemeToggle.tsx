import type { Theme } from '../hooks/useTheme';

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      aria-label={theme === 'dark' ? 'Licht thema' : 'Donker thema'}
      title={theme === 'dark' ? 'Licht thema' : 'Donker thema'}
      style={{
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '6px 8px',
        cursor: 'pointer',
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--text-lg)',
        lineHeight: 1,
        transition: 'all var(--transition-fast)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
