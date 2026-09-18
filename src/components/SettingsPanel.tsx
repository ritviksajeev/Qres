import { useState } from 'react';
import { Panel } from './Panel';
import { Select, Switch } from './Select';
import { Trash } from './Icons';
import { Res, SectionHead } from './SectionHead';
import { HOTKEY_CHOICES, uid } from '../lib/ipc';
import { parseResolution } from '../lib/presets';
import type { DisplayInfo, PresetHotkey, Settings } from '../lib/types';

interface SettingsPanelProps {
  settings: Settings;
  display: DisplayInfo | null;
  onBack: () => void;
  onSet: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  onRestoreDefaults: () => void;
}

export function SettingsPanel({ settings, display, onBack, onSet, onRestoreDefaults }: SettingsPanelProps) {
  const [accelerator, setAccelerator] = useState('Ctrl+Alt+R');
  const [res, setRes] = useState(display ? `${display.native.width}x${display.native.height}` : '');
  const [error, setError] = useState<string | null>(null);

  const addHotkey = () => {
    const parsed = parseResolution(res);
    if (!parsed) return setError('Resolution should look like 1920x1080.');
    if (settings.presetHotkeys.some((entry) => entry.accelerator === accelerator)) {
      return setError(`${accelerator} is already bound.`);
    }
    if (settings.hotkey.accelerator === accelerator && settings.hotkey.enabled) {
      return setError(`${accelerator} is the toggle hotkey.`);
    }

    setError(null);
    const next: PresetHotkey[] = [
      ...settings.presetHotkeys,
      { id: uid(), accelerator, width: parsed.width, height: parsed.height, refresh: 'max' },
    ];
    onSet('presetHotkeys', next);
  };

  const removeHotkey = (id: string) => {
    onSet('presetHotkeys', settings.presetHotkeys.filter((entry) => entry.id !== id));
  };

  return (
    <Panel title="Settings" onBack={onBack}>
      <div className="card">
        <Switch
          checked={settings.persistMode}
          onChange={(value) => onSet('persistMode', value)}
          label="Remember across reboots"
          description="Writes the mode to the registry like a normal Windows display change. Off means every switch is temporary."
        />
        <Switch
          checked={settings.confirmChanges}
          onChange={(value) => onSet('confirmChanges', value)}
          label="Confirm changes made here"
          description="A countdown puts the old mode back if the screen goes dark. Hotkey and game-profile switches always skip it."
        />
        {settings.confirmChanges ? (
          <div className="field-row" style={{ marginTop: 10 }}>
            <span className="field-label">Wait</span>
            <Select
              value={String(settings.confirmSeconds)}
              onChange={(value) => onSet('confirmSeconds', Number(value))}
              compact
              aria-label="Confirmation timeout"
            >
              {[5, 10, 15, 20, 30].map((seconds) => (
                <option key={seconds} value={seconds}>{seconds} seconds</option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 18 }}>
        <SectionHead num="01" label="Startup" />
      </div>

      <div className="card">
        <Switch
          checked={settings.startOnLogin}
          onChange={(value) => onSet('startOnLogin', value)}
          label="Start with Windows"
          description="Launches hidden in the tray so the hotkey is live before you open a game."
        />
        <Switch
          checked={settings.startMinimized}
          onChange={(value) => onSet('startMinimized', value)}
          label="Start minimised"
        />
        <Switch
          checked={settings.minimizeToTray}
          onChange={(value) => onSet('minimizeToTray', value)}
          label="Close to tray"
          description="Closing the window keeps the hotkey running. Quit from the tray menu to stop it."
        />
        <Switch
          checked={settings.checkUpdates}
          onChange={(value) => onSet('checkUpdates', value)}
          label="Check for updates on launch"
        />
      </div>

      <div style={{ marginTop: 18 }}>
        <SectionHead
          num="02"
          label="Extra hotkeys"
          note={<span className="section-note">{String(settings.presetHotkeys.length).padStart(2, '0')}</span>}
        />
      </div>

      {settings.presetHotkeys.length === 0 ? (
        <div className="empty">Bind a key straight to one resolution, on top of the native/stretched toggle.</div>
      ) : (
        settings.presetHotkeys.map((entry) => (
          <div className="card" key={entry.id}>
            <div className="card-head" style={{ marginBottom: 0 }}>
              <span className="card-title">
                <span className="tag purple">{entry.accelerator}</span>
                <span className="mono" style={{ fontSize: 11 }}><Res width={entry.width} height={entry.height} /></span>
              </span>
              <button className="btn icon" onClick={() => removeHotkey(entry.id)} aria-label="Delete hotkey">
                <Trash />
              </button>
            </div>
          </div>
        ))
      )}

      <div className="card" style={{ marginTop: 8 }}>
        <div className="form-grid">
          <Select value={accelerator} onChange={setAccelerator} compact aria-label="Hotkey">
            {HOTKEY_CHOICES.map((choice) => (
              <option key={choice} value={choice}>{choice}</option>
            ))}
          </Select>
          <input
            className="input"
            style={{ height: 30, fontSize: 11 }}
            value={res}
            spellCheck={false}
            placeholder="1920x1080"
            onChange={(event) => setRes(event.target.value)}
            aria-label="Resolution"
          />
          <button className="btn small primary full" onClick={addHotkey}>Bind hotkey</button>
        </div>
        {error ? <div className="switch-desc" style={{ color: 'var(--error)', marginTop: 8 }}>{error}</div> : null}
      </div>

      <div style={{ marginTop: 18 }}>
        <SectionHead num="03" label="Danger zone" />
      </div>

      <div className="card">
        <div className="switch-desc" style={{ marginBottom: 10 }}>
          Puts every attached display back on the mode Windows has stored for it.
        </div>
        <button className="btn danger wide" onClick={onRestoreDefaults}>Restore Windows defaults</button>
      </div>
    </Panel>
  );
}
