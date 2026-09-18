export interface Mode {
  width: number;
  height: number;
  refresh: number;
  bpp: number;
}

export interface ResolutionEntry {
  width: number;
  height: number;
  refreshRates: number[];
}

export interface DisplayInfo {
  id: string;
  adapter: string;
  monitor: string;
  /** Stable hardware identity - custom names are keyed on this, not the slot. */
  monitorId: string;
  label: string;
  renamed: boolean;
  shortId: string;
  primary: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  refresh: number;
  bpp: number;
  orientation: number;
  native: { width: number; height: number; refresh: number };
  modes: Mode[];
  resolutions: ResolutionEntry[];
  refreshRates: number[];
}

export type RefreshChoice = number | 'max';

export interface ToggleMode {
  width: number;
  height: number;
  refresh: RefreshChoice;
}

export interface PresetHotkey {
  id: string;
  accelerator: string;
  width: number;
  height: number;
  refresh: RefreshChoice;
}

export interface CustomPreset {
  id: string;
  width: number;
  height: number;
  label?: string;
}

export interface GameProfile {
  id: string;
  enabled: boolean;
  name: string;
  process: string;
  width: number;
  height: number;
  refresh: RefreshChoice;
  display?: string;
  revertOnExit: boolean;
}

export interface Settings {
  theme: 'dark' | 'light';
  targetDisplay: string;
  refresh: RefreshChoice;
  persistMode: boolean;
  confirmChanges: boolean;
  confirmSeconds: number;
  hotkey: { enabled: boolean; accelerator: string };
  toggle: { native: ToggleMode | null; stretched: ToggleMode | null };
  presetHotkeys: PresetHotkey[];
  customPresets: CustomPreset[];
  gameProfiles: GameProfile[];
  watcherEnabled: boolean;
  startOnLogin: boolean;
  startMinimized: boolean;
  checkUpdates: boolean;
  monitorNames: Record<string, string>;
  lastSeenVersion: string | null;
  window: { width: number; height: number; x: number | null; y: number | null };
}

export interface AppState {
  settings: Settings;
  displays: DisplayInfo[];
  activeId: string | null;
  toggle: { native: ToggleMode; stretched: ToggleMode } | null;
  hotkeyActive: boolean;
  version: string;
  platform: string;
  error: string | null;
}

export interface ApplyResult {
  ok: boolean;
  id?: string;
  width?: number;
  height?: number;
  refresh?: number;
  code?: number;
  message?: string;
  previous?: { width: number; height: number; refresh: number; bpp: number };
}

export interface UpdateResult {
  ok: boolean;
  current?: string;
  latest?: string;
  available?: boolean;
  notes?: string;
  url?: string;
  download?: string | null;
  downloadName?: string | null;
  publishedAt?: string | null;
  message?: string;
}

export interface ApplyRequest {
  width: number;
  height: number;
  refresh?: RefreshChoice;
  display?: string;
  source?: string;
}

export interface Toast {
  message: string;
  tone: 'info' | 'ok' | 'warn' | 'error';
}

export interface RevertPrompt {
  previous: { width: number; height: number; refresh: number };
  seconds: number;
  deadline: number;
}

export interface UninstallPlan {
  kind: 'installed' | 'portable';
  folder: string | null;
  paths: string[];
}

export interface UninstallResult {
  kind: 'installed' | 'portable';
  handedOff: boolean;
  failed: string[];
  folder?: string | null;
  error?: string;
}

export interface TrayMenuItem {
  type: 'header' | 'separator' | 'item';
  id?: string;
  label?: string;
  value?: string;
  hint?: string | null;
  accent?: boolean;
  danger?: boolean;
}

export interface TrayMenuModel {
  items: TrayMenuItem[];
  theme: 'dark' | 'light';
  version: string;
}

export interface QresBridge {
  getState(): Promise<AppState>;
  refreshDisplays(): Promise<AppState>;
  apply(request: ApplyRequest): Promise<ApplyResult>;
  toggle(): Promise<{ ok: boolean; message?: string }>;
  restoreDefaults(): Promise<ApplyResult>;
  set<K extends keyof Settings>(key: K, value: Settings[K]): Promise<AppState>;
  keepChanges(): Promise<{ ok: boolean }>;
  revertChanges(): Promise<{ ok: boolean }>;
  checkUpdates(): Promise<UpdateResult>;
  openExternal(url: string): Promise<void>;
  window(action: 'minimize' | 'hide' | 'close'): Promise<void>;

  uninstallPlan(): Promise<UninstallPlan>;
  uninstallRun(): Promise<UninstallResult>;
  quit(): Promise<void>;

  trayMenuGet(): Promise<TrayMenuModel | null>;
  trayMenuSize(width: number, height: number): Promise<void>;
  trayMenuAction(id: string): Promise<void>;
  trayMenuClose(): Promise<void>;
  onTrayMenuModel(handler: (model: TrayMenuModel) => void): () => void;
  onState(handler: (state: AppState) => void): () => void;
  onApplied(handler: (result: ApplyResult) => void): () => void;
  onToast(handler: (toast: Toast) => void): () => void;
  onRevertOpen(handler: (prompt: RevertPrompt) => void): () => void;
  onRevertClosed(handler: (info: { reverted: boolean }) => void): () => void;
  onHotkeyState(handler: (info: { active: string[]; failed: { accelerator: string; reason: string }[] }) => void): () => void;
  onProfileEvent(handler: (info: { type: string; id: string; name: string }) => void): () => void;
}

declare global {
  interface Window {
    qres: QresBridge;
  }
}
