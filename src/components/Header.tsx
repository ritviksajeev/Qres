import { Select } from './Select';
import { Moon, Sliders, Sun } from './Icons';
import type { DisplayInfo, Settings } from '../lib/types';

interface HeaderProps {
  settings: Settings;
  displays: DisplayInfo[];
  activeId: string | null;
  onTarget: (value: string) => void;
  onTheme: () => void;
  onSettings: () => void;
}

// The control row: which display changes, and the two ways into app chrome.
export function Header({ settings, displays, activeId, onTarget, onTheme, onSettings }: HeaderProps) {
  const dark = settings.theme === 'dark';
  const active = displays.find((d) => d.id === activeId);

  return (
    <header className="header">
      <Select
        value={settings.targetDisplay}
        onChange={onTarget}
        compact
        aria-label="Target display"
        title={
          settings.targetDisplay === 'auto' && active
            ? `Auto - currently ${active.label}`
            : 'Which display changes resolution'
        }
      >
        <option value="auto">Auto · monitor under cursor</option>
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
    </header>
  );
}
