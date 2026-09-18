import { Panel } from './Panel';
import { KV, Res } from './SectionHead';
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
      action={<button className="head-btn" onClick={onRefresh} aria-label="Re-read displays" title="Re-read displays"><Refresh /></button>}
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
              <KV label="Current">
                <Res width={display.width} height={display.height} /> · {display.refresh}Hz · {display.bpp}-bit · {ratioOf(display.width, display.height)}
              </KV>
              <KV label="Native">
                <Res width={display.native.width} height={display.native.height} /> · {display.native.refresh}Hz
              </KV>
              <KV label="Rates">
                {display.refreshRates.length ? `${display.refreshRates.join(' / ')} Hz` : '—'}
              </KV>
              <KV label="Modes">
                {display.resolutions.length} resolutions · {display.modes.length} total
              </KV>
              <KV label="Position">{display.x}, {display.y}</KV>
              <KV label="Adapter">{display.adapter || '—'}</KV>
            </dl>
          </div>
        ))
      )}
    </Panel>
  );
}
