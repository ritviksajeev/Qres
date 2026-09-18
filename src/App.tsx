import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { qr } from './lib/ipc';
import { buildPresets, type Preset } from './lib/presets';
import type { AppState, GameProfile, RevertPrompt, Settings, Toast, UpdateResult } from './lib/types';
import type { PanelId } from './lib/types.panels';

import { TitleBar } from './components/TitleBar';
import { Header } from './components/Header';
import { QuickResolutions } from './components/QuickResolutions';
import { CustomResolution } from './components/CustomResolution';
import { HotkeyPanel } from './components/HotkeyPanel';
import { StatusLine } from './components/StatusLine';
import { Footer } from './components/Footer';
import { Toasts } from './components/Toasts';
import { RevertDialog } from './components/RevertDialog';
import { MonitorsPanel } from './components/MonitorsPanel';
import { ProfilesPanel } from './components/ProfilesPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { FaqPanel } from './components/FaqPanel';
import { UpdatesPanel } from './components/UpdatesPanel';
import { Warning } from './components/Icons';

const TOAST_MS = 3200;

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [toasts, setToasts] = useState<(Toast & { id: number })[]>([]);
  const [revert, setRevert] = useState<RevertPrompt | null>(null);
  const [update, setUpdate] = useState<UpdateResult | null>(null);
  const [busy, setBusy] = useState(false);
  const toastId = useRef(0);

  // ---- wiring -------------------------------------------------------------

  useEffect(() => {
    void qr.getState().then(setState);

    const offState = qr.onState(setState);
    const offRevertOpen = qr.onRevertOpen(setRevert);
    const offRevertClosed = qr.onRevertClosed(() => setRevert(null));

    const offToast = qr.onToast((toast) => {
      const id = ++toastId.current;
      setToasts((current) => [...current.slice(-2), { ...toast, id }]);
      setTimeout(() => setToasts((current) => current.filter((entry) => entry.id !== id)), TOAST_MS);
    });

    return () => {
      offState();
      offToast();
      offRevertOpen();
      offRevertClosed();
    };
  }, []);

  const theme = state?.settings.theme ?? 'dark';
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // A quiet check on launch; the badge in the footer is the only nag.
  useEffect(() => {
    if (!state?.settings.checkUpdates || update) return;
    const timer = setTimeout(() => { void qr.checkUpdates().then(setUpdate); }, 2000);
    return () => clearTimeout(timer);
  }, [state?.settings.checkUpdates, update]);

  // ---- derived ------------------------------------------------------------

  const display = useMemo(
    () => state?.displays.find((entry) => entry.id === state.activeId) ?? null,
    [state],
  );

  const presets = useMemo(() => buildPresets(display), [display]);

  // ---- actions ------------------------------------------------------------

  const run = useCallback(async (work: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await work();
    } finally {
      setBusy(false);
    }
  }, []);

  const applyMode = useCallback(
    (width: number, height: number) => run(() => qr.apply({ width, height })),
    [run],
  );

  const set = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    void qr.set(key, value).then(setState);
  }, []);

  const setToggleMode = useCallback(
    (which: 'native' | 'stretched', width: number, height: number) => {
      if (!state?.toggle) return;
      set('toggle', { ...state.toggle, [which]: { width, height, refresh: 'max' } } as Settings['toggle']);
    },
    [set, state],
  );

  const toggleHotkey = useCallback(() => {
    if (!state) return;
    set('hotkey', { ...state.settings.hotkey, enabled: !state.settings.hotkey.enabled });
  }, [set, state]);

  const refreshDisplays = useCallback(() => {
    void qr.refreshDisplays().then(setState);
  }, []);

  // ---- render -------------------------------------------------------------

  if (!state) {
    return <div className="loading">Reading displays…</div>;
  }

  const { settings } = state;
  const updateAvailable = !!update?.ok && !!update.available;

  const closePanel = () => setPanel(null);

  return (
    <div className="app">
      <div className="app-grain" aria-hidden="true" />

      <TitleBar version={state.version} minimizeToTray={settings.minimizeToTray} />

      <Header
        settings={settings}
        displays={state.displays}
        activeId={state.activeId}
        onTarget={(value) => set('targetDisplay', value)}
        onTheme={() => set('theme', theme === 'dark' ? 'light' : 'dark')}
        onSettings={() => setPanel('settings')}
      />

      <StatusLine display={display} settings={settings} />

      <div className="body">
        {state.error ? (
          <div className="banner">
            <span style={{ color: 'var(--error)' }}><Warning /></span>
            <span>{state.error}</span>
          </div>
        ) : null}

        {state.platform !== 'win32' ? (
          <div className="banner info">
            <span style={{ color: 'var(--purple-bright)' }}><Warning /></span>
            <span>QuickRes changes display modes through the Windows display API, so the controls stay inert here.</span>
          </div>
        ) : null}

        <QuickResolutions
          presets={presets}
          display={display}
          busy={busy}
          onApply={(preset: Preset) => applyMode(preset.width, preset.height)}
          onRefresh={refreshDisplays}
        />

        <CustomResolution
          display={display}
          refresh={settings.refresh}
          busy={busy}
          onRefreshChange={(value) => set('refresh', value)}
          onApply={applyMode}
        />

        <HotkeyPanel
          settings={settings}
          display={display}
          toggle={state.toggle}
          hotkeyActive={state.hotkeyActive}
          onAccelerator={(accelerator) => set('hotkey', { ...settings.hotkey, accelerator })}
          onToggleHotkey={toggleHotkey}
          onToggleMode={setToggleMode}
        />
      </div>

      <Footer panel={panel} onPanel={setPanel} updateAvailable={updateAvailable} />

      <Toasts toasts={toasts} />

      {panel === 'monitors' ? (
        <MonitorsPanel
          displays={state.displays}
          activeId={state.activeId}
          onBack={closePanel}
          onRefresh={refreshDisplays}
        />
      ) : null}

      {panel === 'profiles' ? (
        <ProfilesPanel
          settings={settings}
          display={display}
          onBack={closePanel}
          onChange={(profiles: GameProfile[]) => set('gameProfiles', profiles)}
          onWatcher={(enabled) => set('watcherEnabled', enabled)}
        />
      ) : null}

      {panel === 'settings' ? (
        <SettingsPanel
          settings={settings}
          display={display}
          onBack={closePanel}
          onSet={set}
          onRestoreDefaults={() => void qr.restoreDefaults().then(refreshDisplays)}
        />
      ) : null}

      {panel === 'faq' ? <FaqPanel onBack={closePanel} /> : null}

      {panel === 'updates' ? (
        <UpdatesPanel version={state.version} result={update} onBack={closePanel} onResult={setUpdate} />
      ) : null}

      {revert ? (
        <RevertDialog
          prompt={revert}
          onKeep={() => { setRevert(null); void qr.keepChanges(); }}
          onRevert={() => { setRevert(null); void qr.revertChanges(); }}
        />
      ) : null}
    </div>
  );
}
