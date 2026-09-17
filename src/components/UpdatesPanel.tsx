import { useEffect, useState } from 'react';
import { Panel } from './Panel';
import { qr } from '../lib/ipc';
import type { UpdateResult } from '../lib/types';

interface UpdatesPanelProps {
  version: string;
  result: UpdateResult | null;
  onBack: () => void;
  onResult: (result: UpdateResult) => void;
}

export function UpdatesPanel({ version, result, onBack, onResult }: UpdatesPanelProps) {
  const [busy, setBusy] = useState(false);

  const check = async () => {
    setBusy(true);
    try {
      onResult(await qr.checkUpdates());
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!result) void check();
    // Only on first open - re-checking on every render would hammer the API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Panel title="Updates" onBack={onBack}>
      <div className="card">
        <dl className="kv">
          <dt>Installed</dt>
          <dd className="mono">v{version}</dd>
          <dt>Latest</dt>
          <dd className="mono">{result?.ok ? `v${result.latest}` : busy ? 'checking…' : '—'}</dd>
        </dl>

        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn wide" onClick={check} disabled={busy}>
            {busy ? 'Checking…' : 'Check again'}
          </button>
          {result?.ok && result.available ? (
            <button
              className="btn primary"
              onClick={() => qr.openExternal(result.download || result.url || 'https://github.com/ritviksajeev/Qres/releases')}
            >
              Download
            </button>
          ) : null}
        </div>
      </div>

      {result && !result.ok ? (
        <div className="card" style={{ marginTop: 8 }}>
          <div className="switch-desc">Could not check: {result.message}</div>
        </div>
      ) : null}

      {result?.ok && !result.available ? (
        <div className="card" style={{ marginTop: 8 }}>
          <div className="switch-desc">You are on the latest build.</div>
        </div>
      ) : null}

      {result?.ok && result.available && result.notes ? (
        <div className="card" style={{ marginTop: 8 }}>
          <div className="card-head"><span className="card-title">What's new</span></div>
          <div className="switch-desc" style={{ whiteSpace: 'pre-wrap' }}>{result.notes.slice(0, 1200)}</div>
        </div>
      ) : null}
    </Panel>
  );
}
