import { useEffect, useState } from 'react';
import { Res } from './SectionHead';
import type { RevertPrompt } from '../lib/types';

interface RevertDialogProps {
  prompt: RevertPrompt;
  onKeep: () => void;
  onRevert: () => void;
}

export function RevertDialog({ prompt, onKeep, onRevert }: RevertDialogProps) {
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((prompt.deadline - Date.now()) / 1000)));

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.ceil((prompt.deadline - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [prompt.deadline]);

  // Enter keeps, Escape reverts - the same muscle memory as the Windows dialog.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter') onKeep();
      if (event.key === 'Escape') onRevert();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKeep, onRevert]);

  const pct = Math.max(0, Math.min(100, (left / prompt.seconds) * 100));

  return (
    <div className="overlay">
      <div className="dialog">
        <span className="eyebrow">Confirm</span>
        <div className="dialog-title">Keep this<br />resolution?</div>
        <p className="dialog-copy">
          If you can read this, it worked. Doing nothing puts you back on{' '}
          <span className="mono"><Res width={prompt.previous.width} height={prompt.previous.height} /></span>.
        </p>

        <div className="countdown">{String(left).padStart(2, '0')}s</div>
        <div className="countdown-track"><div className="countdown-fill" style={{ width: `${pct}%` }} /></div>

        <div className="dialog-actions">
          <button className="btn wide primary" onClick={onKeep}>Keep it</button>
          <button className="btn wide" onClick={onRevert}>Revert</button>
        </div>
      </div>
    </div>
  );
}
