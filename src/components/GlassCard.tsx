import type { CSSProperties, ReactNode } from 'react';
import { useJournal } from '../store/JournalContext';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  hover?: boolean;
  padding?: string;
}

export function GlassCard({ children, className = '', style, onClick, hover = false, padding = '20px' }: GlassCardProps) {
  const { state } = useJournal();
  const blur = state.settings.blurIntensity;

  return (
    <div
      className={`glass-card${hover ? ' glass-card--hover' : ''} ${className}`}
      style={{
        backdropFilter: `blur(${blur}px) saturate(1.2)`,
        WebkitBackdropFilter: `blur(${blur}px) saturate(1.2)`,
        background: 'rgba(18, 22, 28, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        boxShadow: '0 18px 60px rgba(0,0,0,0.55), 0 2px 10px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 0 0 1px rgba(255,255,255,0.03)',
        padding,
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
