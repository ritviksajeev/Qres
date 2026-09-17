import { useState } from 'react';
import { parseResolution } from '../lib/presets';
import { Select } from './Select';
import type { DisplayInfo, RefreshChoice } from '../lib/types';

interface CustomResolutionProps {
  display: DisplayInfo | null;
  refresh: RefreshChoice;
  busy: boolean;
  onRefreshChange: (value: RefreshChoice) => void;
  onApply: (width: number, height: number) => void;
}

export function CustomResolution({ display, refresh, busy, onRefreshChange, onApply }: CustomResolutionProps) {
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);

  const parsed = parseResolution(value);
  const invalid = touched && value.trim().length > 0 && !parsed;

  const submit = () => {
    setTouched(true);
    if (parsed) onApply(parsed.width, parsed.height);
  };

  const rates = display ? display.refreshRates : [];

  return (
    <section className="section">
      <div className="section-head">
        <span className="section-label">Custom resolution</span>
        {invalid ? <span className="section-note" style={{ color: 'var(--error)' }}>Use 1920x1080</span> : null}
      </div>

      <div className="row">
        <input
          className={`input${invalid ? ' invalid' : ''}`}
          value={value}
          placeholder={display ? `${display.native.width}x${display.native.height}` : '1920x1080'}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => setTouched(true)}
          onKeyDown={(event) => { if (event.key === 'Enter') submit(); }}
          spellCheck={false}
          aria-label="Custom resolution"
        />
        <button className="btn" onClick={submit} disabled={busy || !parsed}>Apply</button>
      </div>

      <div className="field-row" style={{ marginTop: 7 }}>
        <span className="field-label">Refresh</span>
        <Select
          value={String(refresh)}
          onChange={(next) => onRefreshChange(next === 'max' ? 'max' : Number(next))}
          aria-label="Refresh rate"
          title="Applies to every resolution change"
        >
          <option value="max">Highest available (default)</option>
          {rates.map((rate) => (
            <option key={rate} value={rate}>{rate} Hz</option>
          ))}
        </Select>
      </div>
    </section>
  );
}
