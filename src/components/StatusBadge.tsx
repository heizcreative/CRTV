import type { TradeResult, Direction } from '../types/trade';

interface StatusBadgeProps {
  result?: TradeResult;
  direction?: Direction;
  label?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ result, direction, label, size = 'sm' }: StatusBadgeProps) {
  let colorClass = 'badge-neutral';
  let text = label ?? '';

  if (result === 'Win') {
    colorClass = 'badge-win';
    text = label ?? 'Win';
  } else if (result === 'Loss') {
    colorClass = 'badge-loss';
    text = label ?? 'Loss';
  } else if (result === 'BE') {
    colorClass = 'badge-be';
    text = label ?? 'BE';
  } else if (direction === 'Long') {
    colorClass = 'badge-long';
    text = label ?? 'Long';
  } else if (direction === 'Short') {
    colorClass = 'badge-short';
    text = label ?? 'Short';
  }

  return (
    <span className={`badge ${colorClass} ${size === 'md' ? 'badge-md' : ''}`}>
      {text}
    </span>
  );
}

interface TagBadgeProps {
  label: string;
}

export function TagBadge({ label }: TagBadgeProps) {
  return <span className="badge badge-tag">{label}</span>;
}
