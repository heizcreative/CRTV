import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

interface GlassTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

interface GlassSelectProps {
  label?: string;
  error?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function GlassInput({ label, error, className = '', ...props }: GlassInputProps) {
  return (
    <div className="glass-field">
      {label && <label className="glass-label">{label}</label>}
      <input
        className={`glass-input ${error ? 'glass-input--error' : ''} ${className}`}
        {...props}
      />
      {error && <span className="glass-error">{error}</span>}
    </div>
  );
}

export function GlassTextarea({ label, error, className = '', ...props }: GlassTextareaProps) {
  return (
    <div className="glass-field">
      {label && <label className="glass-label">{label}</label>}
      <textarea
        className={`glass-input glass-textarea ${error ? 'glass-input--error' : ''} ${className}`}
        {...props}
      />
      {error && <span className="glass-error">{error}</span>}
    </div>
  );
}

export function GlassSelect({ label, error, value, onChange, options, placeholder }: GlassSelectProps) {
  return (
    <div className="glass-field">
      {label && <label className="glass-label">{label}</label>}
      <select
        className={`glass-input glass-select ${error ? 'glass-input--error' : ''}`}
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <span className="glass-error">{error}</span>}
    </div>
  );
}
