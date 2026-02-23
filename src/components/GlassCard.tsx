import type { CSSProperties, ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  hover?: boolean;
  padding?: string;
}

export function GlassCard({ children, className = '', style, onClick, hover = false, padding = '20px' }: GlassCardProps) {
  return (
    <div
      className={`glass-card${hover ? ' glass-card--hover' : ''} ${className}`}
      style={{
        backdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-sat))',
        WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-sat))',
        background: 'var(--glass-fill)',
        border: '1px solid var(--glass-border)',
        borderRadius: '24px',
        boxShadow: '0 18px 60px var(--glass-shadow-1), 0 2px 10px var(--glass-shadow-2), inset 0 1px 0 var(--glass-inner-top), inset 0 0 0 1px var(--glass-inner-edge)',
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
