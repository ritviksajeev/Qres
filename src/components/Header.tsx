import { Select } from './Select';
import { Mark, Moon, Sliders, Sun } from './Icons';
import type { DisplayInfo, Settings } from '../lib/types';

interface HeaderProps {
  version: string;
  settings: Settings;
  displays: DisplayInfo[];
  activeId: string | null;
  onTarget: (value: string) => void;
  onTheme: () => void;
  onSettings: () => void;
}

export function Header({ version, settings, displays, activeId, onTarget, onTheme, onSettings }: HeaderProps) {
  const dark = settings.theme === 'dark';
  const active = displays.find((d) => d.id === activeId);

  return (
    <header className="header">
      <div className="brand">
        <span className="brand-mark"><Mark /></span>
        <span className="brand-name">QuickRes</span>
        <span className="brand-version">v{version}</span>
      </div>

      <div className="header-tools">
        <Select
          value={settings.targetDisplay}
          onChange={onTarget}
          compact
          narrow
          aria-label="Target display"
          title={
            settings.targetDisplay === 'auto' && active
              ? `Auto - currently ${active.label}`
              : 'Which display changes resolution'
          }
        >
          <option value="auto">Auto</option>
          <option value="primary">Primary</option>
          {displays.map((display) => (
            <option key={display.id} value={display.id}>
              {display.shortId} · {display.label}
            </option>
          ))}
        </Select>

        <button className="btn icon" onClick={onTheme} title={dark ? 'Switch to light' : 'Switch to dark'} aria-label="Toggle theme">
          {dark ? <Sun /> : <Moon />}
        </button>

        <button className="btn icon" onClick={onSettings} title="Settings" aria-label="Settings">
          <Sliders />
        </button>
      </div>
    </header>
  );
}
