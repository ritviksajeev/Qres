import { qr } from '../lib/ipc';
import { Close, Minimize, Restore } from './Icons';

export function TitleBar({ minimizeToTray }: { minimizeToTray: boolean }) {
  return (
    <div className="titlebar">
      <span className="titlebar-name">QuickRes</span>
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
