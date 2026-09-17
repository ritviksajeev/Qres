import type { DisplayInfo, Settings } from '../lib/types';

interface StatusLineProps {
  display: DisplayInfo | null;
  settings: Settings;
}

// A permanent read-out of what is actually on screen right now. Without it you
// have to trust that the highlighted tile is still true.
export function StatusLine({ display, settings }: StatusLineProps) {
  if (!display) return null;

  const auto = settings.targetDisplay === 'auto';

  return (
    <div className="statusline">
      <span className="statusline-name" title={display.adapter}>
        <span className="statusline-dot" />
        {display.label}
        {auto ? <span className="dim"> · auto</span> : null}
      </span>
      <span className="mono statusline-mode">
        {display.width} × {display.height} @ {display.refresh} Hz
      </span>
    </div>
  );
}
