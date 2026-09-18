import { useState } from 'react';
import { Panel } from './Panel';
import { KV, Res } from './SectionHead';
import { Refresh } from './Icons';
import { ratioOf } from '../lib/presets';
import type { DisplayInfo, Settings } from '../lib/types';

interface MonitorsPanelProps {
  displays: DisplayInfo[];
  activeId: string | null;
  settings: Settings;
  onBack: () => void;
  onRefresh: () => void;
  onRename: (names: Record<string, string>) => void;
}

export function MonitorsPanel({ displays, activeId, settings, onBack, onRefresh, onRename }: MonitorsPanelProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const begin = (display: DisplayInfo) => {
    setEditing(display.monitorId || display.id);
    setDraft(display.label);
  };

  const commit = (display: DisplayInfo) => {
    const key = display.monitorId || display.id;
    const next = { ...(settings.monitorNames || {}) };
    const name = draft.trim().slice(0, 40);

    // An empty name, or the detected one typed back in, means "no override".
    if (!name || name === display.monitor) delete next[key];
    else next[key] = name;

    onRename(next);
    setEditing(null);
  };

  const reset = (display: DisplayInfo) => {
    const next = { ...(settings.monitorNames || {}) };
    delete next[display.monitorId || display.id];
    delete next[display.id];
    onRename(next);
  };

  return (
    <Panel
      title="Monitors"
      onBack={onBack}
      action={<button className="head-btn" onClick={onRefresh} aria-label="Re-read displays" title="Re-read displays"><Refresh /></button>}
    >
      {displays.length === 0 ? (
        <div className="empty">No displays reported yet.</div>
      ) : (
        displays.map((display) => {
          const key = display.monitorId || display.id;
          const isEditing = editing === key;

          return (
            <div className="card" key={display.id}>
              <div className="card-head">
                {isEditing ? (
                  <input
                    className="input rename"
                    value={draft}
                    autoFocus
                    maxLength={40}
                    spellCheck={false}
                    placeholder={display.monitor}
                    aria-label="Monitor name"
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') commit(display);
                      if (event.key === 'Escape') setEditing(null);
                    }}
                    onBlur={() => commit(display)}
                  />
                ) : (
                  <span className="card-title">
                    <button className="rename-target" onClick={() => begin(display)} title="Rename this monitor">
                      {display.label}
                    </button>
                    {display.primary ? <span className="tag purple">Primary</span> : null}
                    {display.id === activeId ? <span className="tag ok">Target</span> : null}
                  </span>
                )}

                {isEditing ? null : <span className="tag">{display.shortId}</span>}
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
                {display.renamed ? <KV label="Detected">{display.monitor}</KV> : null}
              </dl>

              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn small wide" onClick={() => begin(display)}>Rename</button>
                {display.renamed ? (
                  <button className="btn small" onClick={() => reset(display)}>Reset</button>
                ) : null}
              </div>
            </div>
          );
        })
      )}

      <p className="switch-desc" style={{ marginTop: 12 }}>
        A name is stored against the monitor itself, not the display slot, so it survives replugging or reordering
        your screens.
      </p>
    </Panel>
  );
}
