import type { QuickResBridge } from './types';

// The app is only ever loaded inside Electron, but a clear failure beats a
// mystery `undefined` if that ever stops being true.
const bridge = window.quickres;

if (!bridge) {
  document.body.innerHTML =
    '<div style="font:14px system-ui;padding:32px;color:#fff">QuickRes must run inside its Electron shell.</div>';
  throw new Error('preload bridge missing');
}

export const qr: QuickResBridge = bridge;

export const HOTKEY_CHOICES = [
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  'Alt+F1', 'Alt+F2', 'Alt+F3', 'Alt+F4',
  'Ctrl+F1', 'Ctrl+F2', 'Ctrl+F3',
  'Ctrl+Alt+R', 'Ctrl+Alt+S', 'Ctrl+Alt+D',
  'Ctrl+Shift+F1', 'Ctrl+Shift+F2',
  'Alt+Shift+R', 'Alt+Shift+S',
];

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
