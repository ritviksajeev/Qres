import { useEffect, useRef, useState } from 'react';
import { capture, keysOf } from '../lib/accelerator';

interface HotkeyInputProps {
  value: string;
  onChange: (accelerator: string) => void;
  /** Shown instead of keycaps when nothing is bound. */
  placeholder?: string;
  compact?: boolean;
  narrow?: boolean;
  'aria-label'?: string;
}

/**
 * Press-to-bind field. Click it, press the combination, it records what you
 * actually pressed - no dropdown of combinations somebody guessed in advance.
 */
export function HotkeyInput({ value, onChange, placeholder = 'Click, then press', compact, narrow, ...rest }: HotkeyInputProps) {
  const [listening, setListening] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!listening) return;

    const onKeyDown = (event: KeyboardEvent) => {
      // Swallow everything while listening, or Tab moves focus and Space
      // re-triggers the button.
      event.preventDefault();
      event.stopPropagation();

      if (event.code === 'Escape') {
        setListening(false);
        setProblem(null);
        return;
      }

      const result = capture(event);
      if (!result) return;                 // still holding modifiers

      if (result.problem) {
        setProblem(result.problem);
        return;
      }

      if (result.accelerator) {
        onChange(result.accelerator);
        setProblem(null);
        setListening(false);
        ref.current?.blur();
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [listening, onChange]);

  const keys = keysOf(value);

  return (
    <div className={`hotkey-input-wrap${narrow ? ' narrow' : ''}`}>
      <button
        ref={ref}
        type="button"
        aria-label={rest['aria-label'] ?? 'Hotkey'}
        className={`hotkey-input${listening ? ' listening' : ''}${compact ? ' compact' : ''}`}
        onClick={() => { setProblem(null); setListening((on) => !on); }}
        onBlur={() => { setListening(false); setProblem(null); }}
      >
        {listening ? (
          <span className="hotkey-prompt">Press any combination…</span>
        ) : keys.length ? (
          <span className="hotkey-keys">
            {keys.map((key, i) => (
              <span key={`${key}-${i}`} className="keycap">{key}</span>
            ))}
          </span>
        ) : (
          <span className="hotkey-prompt dim">{placeholder}</span>
        )}
      </button>

      {problem ? <div className="hotkey-problem">{problem}</div> : null}
    </div>
  );
}
