import type { ReactNode } from 'react';

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  compact?: boolean;
  narrow?: boolean;
  disabled?: boolean;
  title?: string;
  'aria-label'?: string;
}

export function Select({ value, onChange, children, compact, narrow, disabled, title, ...rest }: SelectProps) {
  const classes = ['select-wrap', compact ? 'compact' : '', narrow ? 'narrow' : ''].filter(Boolean).join(' ');
  return (
    <div className={classes}>
      <select
        className="select"
        value={value}
        disabled={disabled}
        title={title}
        aria-label={rest['aria-label']}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </div>
  );
}

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

export function Switch({ checked, onChange, label, description }: SwitchProps) {
  return (
    <div className="switch-row">
      <div className="switch-copy">
        <div className="switch-title">{label}</div>
        {description ? <div className="switch-desc">{description}</div> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`switch${checked ? ' on' : ''}`}
        onClick={() => onChange(!checked)}
      />
    </div>
  );
}
