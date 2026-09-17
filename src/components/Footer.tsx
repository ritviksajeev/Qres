import { qr } from '../lib/ipc';
import { GitHub } from './Icons';
import type { PanelId } from '../lib/types.panels';

const LINKS: { id: PanelId; label: string }[] = [
  { id: 'faq', label: 'FAQ' },
  { id: 'monitors', label: 'Monitors' },
  { id: 'profiles', label: 'Profiles' },
  { id: 'updates', label: 'Updates' },
];

interface FooterProps {
  panel: PanelId | null;
  onPanel: (panel: PanelId) => void;
  updateAvailable: boolean;
}

export function Footer({ panel, onPanel, updateAvailable }: FooterProps) {
  return (
    <footer className="footer">
      <div className="footer-links">
        {LINKS.map((link) => (
          <button
            key={link.id}
            className={`footer-link${panel === link.id ? ' active' : ''}`}
            onClick={() => onPanel(link.id)}
          >
            {link.label}
            {link.id === 'updates' && updateAvailable ? <span className="preset-dot" style={{ display: 'inline-block', marginLeft: 4, verticalAlign: 'middle' }} /> : null}
          </button>
        ))}
      </div>

      <button
        className="footer-github"
        onClick={() => qr.openExternal('https://github.com/ritviksajeev/qres')}
      >
        <GitHub />
        GitHub
      </button>
    </footer>
  );
}
