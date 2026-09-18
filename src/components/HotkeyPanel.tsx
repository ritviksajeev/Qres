import { HOTKEY_CHOICES } from '../lib/ipc';
import { Select } from './Select';
import { SectionHead } from './SectionHead';
import type { DisplayInfo, Settings, ToggleMode } from '../lib/types';

interface HotkeyPanelProps {
  settings: Settings;
  display: DisplayInfo | null;
  toggle: { native: ToggleMode; stretched: ToggleMode } | null;
  hotkeyActive: boolean;
  onAccelerator: (accelerator: string) => void;
  onToggleHotkey: () => void;
  onToggleMode: (which: 'native' | 'stretched', width: number, height: number) => void;
}

function modeValue(mode: ToggleMode | null): string {
  return mode ? `${mode.width}x${mode.height}` : '';
}

export function HotkeyPanel({
  settings,
  display,
  toggle,
  hotkeyActive,
  onAccelerator,
  onToggleHotkey,
  onToggleMode,
}: HotkeyPanelProps) {
  const running = settings.hotkey.enabled && hotkeyActive;
  const resolutions = display ? display.resolutions : [];

  const pick = (which: 'native' | 'stretched') => (value: string) => {
    const [width, height] = value.split('x').map(Number);
    if (width && height) onToggleMode(which, width, height);
  };

  return (
    <section className="section">
      <SectionHead
        num="03"
        label="Hotkey"
        note={
          <span className={`status-pill${running ? ' on' : ''}`}>
            <span className="dot" />
            {running ? 'Live' : 'Stopped'}
          </span>
        }
      />

      <div className="row">
        <Select
          value={settings.hotkey.accelerator}
          onChange={onAccelerator}
          narrow
          aria-label="Hotkey"
          title="Global hotkey"
        >
          {HOTKEY_CHOICES.map((choice) => (
            <option key={choice} value={choice}>{choice}</option>
          ))}
        </Select>
        <button className={`btn wide${running ? '' : ' primary'}`} onClick={onToggleHotkey}>
          {running ? 'Stop' : 'Start hotkey'}
        </button>
      </div>

      <div className="field-row" style={{ marginTop: 10 }}>
        <span className="field-label">Native</span>
        <Select
          value={modeValue(toggle?.native ?? null)}
          onChange={pick('native')}
          compact
          aria-label="Native resolution"
        >
          {resolutions.map((entry) => (
            <option key={`n-${entry.width}x${entry.height}`} value={`${entry.width}x${entry.height}`}>
              {entry.width} × {entry.height}
            </option>
          ))}
        </Select>
      </div>

      <div className="field-row">
        <span className="field-label">Stretched</span>
        <Select
          value={modeValue(toggle?.stretched ?? null)}
          onChange={pick('stretched')}
          compact
          aria-label="Stretched resolution"
        >
          {resolutions.map((entry) => (
            <option key={`s-${entry.width}x${entry.height}`} value={`${entry.width}x${entry.height}`}>
              {entry.width} × {entry.height}
            </option>
          ))}
        </Select>
      </div>

      <p className="hotkey-hint">
        {running ? (
          <>
            <kbd>{settings.hotkey.accelerator}</kbd> flips between the two from anywhere, fullscreen games included.
          </>
        ) : (
          <>Pick the pair you switch between, then start the hotkey.</>
        )}
      </p>
    </section>
  );
}
