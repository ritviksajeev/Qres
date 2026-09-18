import { qr } from '../lib/ipc';
import { Close, Mark, Minimize, Restore } from './Icons';

// Brand and window controls share one bar. A separate header row for the
// wordmark wastes 40px of a 400px-wide window and says the name twice.
export function TitleBar({ version, minimizeToTray }: { version: string; minimizeToTray: boolean }) {
  return (
    <div className="titlebar">
      <div className="brand">
        <span className="brand-mark"><Mark size={15} /></span>
        <span className="brand-name">QuickRes</span>
        <span className="brand-version">{version}</span>
      </div>

      <div className="titlebar-tools">
        <button className="titlebar-btn" onClick={() => qr.window('minimize')} aria-label="Minimise" title="Minimise">
          <Minimize />
        </button>
        <button className="titlebar-btn" onClick={() => qr.window('hide')} aria-label="Hide to tray" title="Hide to tray">
          <Restore />
        </button>
        <button
          className="titlebar-btn close"
          onClick={() => qr.window('close')}
          aria-label="Close"
          title={minimizeToTray ? 'Close to tray' : 'Quit'}
        >
          <Close />
        </button>
      </div>
    </div>
  );
}
