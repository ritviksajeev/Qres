import type { DisplayInfo, Settings } from '../lib/types';
import { Res } from './SectionHead';

interface StatusLineProps {
  display: DisplayInfo | null;
  settings: Settings;
}

// A permanent read-out of what is actually on screen right now. Without it you
// have to trust that the highlighted tile is still true.
export function StatusLine({ display, settings }: StatusLineProps) {
  if (!display) return null;

  return (
    <div className="statusline">
      <span className="statusline-name" title={display.adapter}>
        <span className="statusline-dot" />
        {display.label}
        {settings.targetDisplay === 'auto' ? <span className="dim">&nbsp;· auto</span> : null}
      </span>
      <span className="statusline-mode">
        <Res width={display.width} height={display.height} /> · {display.refresh}Hz
      </span>
    </div>
  );
}
