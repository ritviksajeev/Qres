import { useState } from 'react';
import { Panel } from './Panel';
import { Select, Switch } from './Select';
import { Trash } from './Icons';
import { parseResolution } from '../lib/presets';
import { uid } from '../lib/ipc';
import type { DisplayInfo, GameProfile, Settings } from '../lib/types';

// Starting points for the games people actually run stretched.
const KNOWN: { name: string; process: string }[] = [
  { name: 'VALORANT', process: 'VALORANT-Win64-Shipping.exe' },
  { name: 'Counter-Strike 2', process: 'cs2.exe' },
  { name: 'Apex Legends', process: 'r5apex.exe' },
  { name: 'Fortnite', process: 'FortniteClient-Win64-Shipping.exe' },
  { name: 'Overwatch 2', process: 'Overwatch.exe' },
  { name: 'Rainbow Six Siege', process: 'RainbowSix.exe' },
  { name: 'Rocket League', process: 'RocketLeague.exe' },
];

interface ProfilesPanelProps {
  settings: Settings;
  display: DisplayInfo | null;
  onBack: () => void;
  onChange: (profiles: GameProfile[]) => void;
  onWatcher: (enabled: boolean) => void;
}

export function ProfilesPanel({ settings, display, onBack, onChange, onWatcher }: ProfilesPanelProps) {
  const profiles = settings.gameProfiles;
  const [name, setName] = useState('');
  const [proc, setProc] = useState('');
  const [res, setRes] = useState(display ? `${Math.round((display.native.height * 4) / 3)}x${display.native.height}` : '');
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const parsed = parseResolution(res);
    if (!name.trim()) return setError('Give the profile a name.');
    if (!/\.exe$/i.test(proc.trim())) return setError('The process needs to end in .exe');
    if (!parsed) return setError('Resolution should look like 1440x1080.');

    setError(null);
    onChange([
      ...profiles,
      {
        id: uid(),
        enabled: true,
        name: name.trim(),
        process: proc.trim(),
        width: parsed.width,
        height: parsed.height,
        refresh: 'max',
        revertOnExit: true,
      },
    ]);
    setName('');
    setProc('');
  };

  const patch = (id: string, changes: Partial<GameProfile>) => {
    onChange(profiles.map((profile) => (profile.id === id ? { ...profile, ...changes } : profile)));
  };

  const remove = (id: string) => onChange(profiles.filter((profile) => profile.id !== id));

  return (
    <Panel title="Game profiles" onBack={onBack}>
      <div className="card">
        <Switch
          checked={settings.watcherEnabled}
          onChange={onWatcher}
          label="Watch for games"
          description="Checks every 3 seconds for the processes below and switches resolution as they open and close."
        />
      </div>

      <div className="section-head" style={{ marginTop: 16 }}>
        <span className="section-label">Profiles</span>
        <span className="section-note">{profiles.length}</span>
      </div>

      {profiles.length === 0 ? (
        <div className="empty">
          Nothing here yet.<br />Add a game below and QuickRes handles the switch on its own.
        </div>
      ) : (
        profiles.map((profile) => (
          <div className="card" key={profile.id}>
            <div className="card-head">
              <span className="card-title">{profile.name}</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  className={`switch${profile.enabled ? ' on' : ''}`}
                  role="switch"
                  aria-checked={profile.enabled}
                  aria-label={`Enable ${profile.name}`}
                  onClick={() => patch(profile.id, { enabled: !profile.enabled })}
                />
                <button className="btn icon" onClick={() => remove(profile.id)} aria-label={`Delete ${profile.name}`}>
                  <Trash />
                </button>
              </div>
            </div>

            <dl className="kv">
              <dt>Process</dt>
              <dd className="mono">{profile.process}</dd>
              <dt>On launch</dt>
              <dd>{profile.width} × {profile.height}</dd>
              <dt>On exit</dt>
              <dd>{profile.revertOnExit ? 'Back to native' : 'Leave it'}</dd>
            </dl>

            <div style={{ marginTop: 8 }}>
              <Switch
                checked={profile.revertOnExit}
                onChange={(value) => patch(profile.id, { revertOnExit: value })}
                label="Restore native on exit"
              />
            </div>
          </div>
        ))
      )}

      <div className="section-head" style={{ marginTop: 16 }}>
        <span className="section-label">Add a profile</span>
      </div>

      <div className="card">
        <div className="form-grid">
          <Select
            value=""
            onChange={(value) => {
              const known = KNOWN.find((entry) => entry.process === value);
              if (known) { setName(known.name); setProc(known.process); }
            }}
            compact
            aria-label="Pick a known game"
          >
            <option value="">Pick a game…</option>
            {KNOWN.map((entry) => (
              <option key={entry.process} value={entry.process}>{entry.name}</option>
            ))}
          </Select>

          <input
            className="input"
            style={{ height: 30, fontSize: 11 }}
            placeholder="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label="Profile name"
          />

          <input
            className="input full"
            style={{ height: 30, fontSize: 11 }}
            placeholder="game.exe"
            value={proc}
            spellCheck={false}
            onChange={(event) => setProc(event.target.value)}
            aria-label="Process name"
          />

          <input
            className="input"
            style={{ height: 30, fontSize: 11 }}
            placeholder="1440x1080"
            value={res}
            spellCheck={false}
            onChange={(event) => setRes(event.target.value)}
            aria-label="Resolution"
          />

          <button className="btn small primary" onClick={add}>Add profile</button>
        </div>

        {error ? <div className="switch-desc" style={{ color: 'var(--error)', marginTop: 8 }}>{error}</div> : null}
      </div>

      <p className="switch-desc" style={{ marginTop: 10 }}>
        Not sure of the process name? Open Task Manager → Details while the game is running and copy the entry ending
        in <span className="mono">.exe</span>.
      </p>
    </Panel>
  );
}
