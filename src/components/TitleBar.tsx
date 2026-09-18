import { qr } from '../lib/ipc';
import { Close, Mark, Minimize } from './Icons';

/**
 * Brand and window controls share one bar. Two buttons only: minimise behaves
 * normally, and X hides to the tray so the hotkey keeps working - quitting is
 * the tray menu's job.
 */
export function TitleBar({ version }: { version: string }) {
  return (
    <div className="titlebar">
      <div className="brand">
        <span className="brand-mark"><Mark height={12} /></span>
        <span className="brand-text">
          <span className="brand-name">Qres</span>
          <span className="brand-version">{version}</span>
        </span>
      </div>

      <div className="titlebar-tools">
        <button className="titlebar-btn" onClick={() => qr.window('minimize')} aria-label="Minimise" title="Minimise">
          <Minimize />
        </button>
        <button
          className="titlebar-btn close"
          onClick={() => qr.window('close')}
          aria-label="Close to tray"
          title="Close to tray — Qres keeps running, quit from the tray"
        >
          <Close />
        </button>
      </div>
    </div>
  );
}
