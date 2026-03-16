import type { StookwijzerResponse } from '../types/weather';
import { STOOKWIJZER_COLORS } from '../utils/colors';

interface StookwijzerBadgeProps {
  data: StookwijzerResponse;
}

export function StookwijzerBadge({ data }: StookwijzerBadgeProps) {
  const color = STOOKWIJZER_COLORS[data.advice] || STOOKWIJZER_COLORS.code_green;

  return (
    <span
      className="badge"
      style={{
        backgroundColor: `${color}0d`,
        color: color,
        border: `1px solid ${color}1a`,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: color,
          display: 'inline-block',
        }}
      />
      {data.label}
    </span>
  );
}
