import { useEffect, useState } from 'react';
import { qr } from '../lib/ipc';
import type { UninstallPlan, UninstallResult } from '../lib/types';

/**
 * Two-step, because this deletes things: describe exactly what goes, then do
 * it. A packaged install hands off to the Windows uninstaller; a portable copy
 * has nothing registered, so it says which folder is left to delete.
 */
export function UninstallDialog({ onClose }: { onClose: () => void }) {
  const [plan, setPlan] = useState<UninstallPlan | null>(null);
  const [result, setResult] = useState<UninstallResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void qr.uninstallPlan().then(setPlan);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy && !result) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, result, onClose]);

  const run = async () => {
    setBusy(true);
    try {
      setResult(await qr.uninstallRun());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay">
      <div className="dialog">
        <span className="eyebrow">Uninstall</span>

        {result ? (
          <>
            <div className="dialog-title">{result.handedOff ? 'Handing over' : 'Almost done'}</div>
            <p className="dialog-copy">
              {result.handedOff ? (
                <>Settings and the display helper are gone. The Windows uninstaller is taking it from here — Qres is about to close.</>
              ) : (
                <>
                  Settings, the cached display helper and the start-with-Windows entry are gone. This is a portable
                  copy, so the last step is yours: delete{' '}
                  <span className="mono">{result.folder || 'the folder Qres is running from'}</span> after it closes.
                </>
              )}
            </p>

            {result.failed.length ? (
              <p className="dialog-copy" style={{ color: 'var(--warn)' }}>
                Could not remove: {result.failed.join(', ')}. Delete by hand.
              </p>
            ) : null}

            {result.handedOff ? null : (
              <div className="dialog-actions">
                <button className="btn wide danger" onClick={() => void qr.quit()}>Quit Qres</button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="dialog-title">Remove Qres?</div>
            <p className="dialog-copy">
              {plan?.kind === 'installed'
                ? 'This clears your settings and the cached display helper, then hands over to the Windows uninstaller.'
                : 'This clears your settings, the cached display helper and the start-with-Windows entry. You delete the folder afterwards.'}
            </p>

            {plan && plan.paths.length ? (
              <div className="dialog-list">
                {plan.paths.map((entry) => <div className="mono" key={entry}>{entry}</div>)}
              </div>
            ) : null}

            <p className="dialog-copy dim">Your display keeps whatever mode it is on. Nothing changes on screen.</p>

            <div className="dialog-actions">
              <button className="btn wide" onClick={onClose} disabled={busy}>Cancel</button>
              <button className="btn wide danger" onClick={run} disabled={busy || !plan}>
                {busy ? 'Removing…' : 'Uninstall'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
