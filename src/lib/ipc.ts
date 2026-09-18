import type { QresBridge } from './types';

// The app is only ever loaded inside Electron, but a clear failure beats a
// mystery `undefined` if that ever stops being true.
const bridge = window.qres;

if (!bridge) {
  document.body.innerHTML =
    '<div style="font:14px system-ui;padding:32px;color:#fff">Qres must run inside its Electron shell.</div>';
  throw new Error('preload bridge missing');
}

export const qr: QresBridge = bridge;

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
