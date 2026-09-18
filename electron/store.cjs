'use strict';

const Store = require('electron-store');

// A stretched profile is only meaningful next to the native one, so the toggle
// pair is stored together and both sides are filled in from the real panel the
// first time Qres sees it.
const defaults = {
  theme: 'dark',
  translucent: true,              // acrylic backdrop on Windows 11; ignored elsewhere
  targetDisplay: 'auto',          // 'auto' (monitor under the cursor) | 'primary' | device id
  refresh: 'max',                 // 'max' keeps the highest rate the panel offers
  persistMode: true,              // write the mode to the registry so it survives a reboot
  confirmChanges: true,           // 15 s "keep this?" guard for changes made in the window
  confirmSeconds: 15,
  hotkey: {
    enabled: false,
    accelerator: 'F6',
  },
  toggle: {
    native: null,                 // { width, height, refresh }
    stretched: null,
  },
  presetHotkeys: [],              // [{ id, accelerator, width, height, refresh }]
  customPresets: [],              // [{ id, width, height, label }]
  gameProfiles: [],               // [{ id, enabled, name, process, width, height, refresh, revertOnExit }]
  watcherEnabled: false,
  startOnLogin: false,
  startMinimized: false,
  minimizeToTray: true,
  checkUpdates: true,
  lastSeenVersion: null,
  window: { width: 400, height: 704, x: null, y: null },
};

const store = new Store({ name: 'qres', defaults });

function all() {
  const out = {};
  for (const key of Object.keys(defaults)) out[key] = store.get(key);
  return out;
}

function get(key) {
  return store.get(key);
}

function set(key, value) {
  if (!Object.prototype.hasOwnProperty.call(defaults, key)) {
    throw new Error(`Unknown setting: ${key}`);
  }
  store.set(key, value);
  return store.get(key);
}

module.exports = { store, all, get, set, defaults };
