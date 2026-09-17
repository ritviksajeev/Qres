import { Panel } from './Panel';
import { Refresh } from './Icons';
import { ratioOf } from '../lib/presets';
import type { DisplayInfo } from '../lib/types';

interface MonitorsPanelProps {
  displays: DisplayInfo[];
  activeId: string | null;
  onBack: () => void;
  onRefresh: () => void;
}

export function MonitorsPanel({ displays, activeId, onBack, onRefresh }: MonitorsPanelProps) {
  return (
    <Panel
      title="Monitors"
      onBack={onBack}
      action={<button className="btn icon" onClick={onRefresh} aria-label="Re-read displays" title="Re-read displays"><Refresh /></button>}
    >
      {displays.length === 0 ? (
        <div className="empty">No displays reported yet.</div>
      ) : (
        displays.map((display) => (
          <div className="card" key={display.id}>
            <div className="card-head">
              <span className="card-title">
                {display.label}
                {display.primary ? <span className="tag purple">Primary</span> : null}
                {display.id === activeId ? <span className="tag ok">Target</span> : null}
              </span>
              <span className="tag">{display.shortId}</span>
            </div>

            <dl className="kv">
              <dt>Current</dt>
              <dd>{display.width} × {display.height} @ {display.refresh} Hz · {display.bpp}-bit · {ratioOf(display.width, display.height)}</dd>

              <dt>Native</dt>
              <dd>{display.native.width} × {display.native.height} @ {display.native.refresh} Hz</dd>

              <dt>Rates</dt>
              <dd>{display.refreshRates.length ? `${display.refreshRates.join(', ')} Hz` : '—'}</dd>

              <dt>Modes</dt>
              <dd>{display.resolutions.length} resolutions · {display.modes.length} total</dd>

              <dt>Position</dt>
              <dd>{display.x}, {display.y}</dd>

              <dt>Adapter</dt>
              <dd>{display.adapter || '—'}</dd>
            </dl>
          </div>
        ))
      )}
    </Panel>
  );
}
