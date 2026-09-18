'use strict';

// Tray menu. Qres is meant to live here - the window is the place you set
// things up, the tray is the place you use it.

const { Tray, Menu, nativeImage } = require('electron');

let tray = null;
let config = null;

function label(mode) {
  if (!mode) return '-';
  const hz = mode.refresh && mode.refresh !== 'max' ? ` @ ${mode.refresh} Hz` : '';
  return `${mode.width} × ${mode.height}${hz}`;
}

async function buildMenu() {
  const summary = config.getSummary ? await config.getSummary() : null;
  const items = [];

  if (summary && summary.display) {
    const d = summary.display;
    items.push({ label: `${d.label} - ${d.width} × ${d.height} @ ${d.refresh} Hz`, enabled: false });
    items.push({ type: 'separator' });
    items.push({
      label: `Toggle native / stretched${summary.hotkey && summary.hotkey.enabled ? `\t${summary.hotkey.accelerator}` : ''}`,
      click: () => config.onToggle(),
    });
    items.push({
      label: `Native - ${label(summary.toggle.native)}`,
      click: () => config.onApply(summary.toggle.native),
    });
    items.push({
      label: `Stretched - ${label(summary.toggle.stretched)}`,
      click: () => config.onApply(summary.toggle.stretched),
    });
  } else {
    items.push({ label: 'Reading displays…', enabled: false });
  }

  items.push({ type: 'separator' });
  items.push({ label: 'Open Qres', click: () => config.onShow() });
  items.push({ label: 'Restore Windows defaults', click: () => config.onRestore() });
  items.push({ type: 'separator' });
  items.push({ label: 'Quit', click: () => config.onQuit() });

  return Menu.buildFromTemplate(items);
}

function createTray(options) {
  config = options;

  let icon = options.icon;
  if (!icon || icon.isEmpty()) icon = nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip('Qres');
  tray.on('click', () => config.onShow());
  tray.on('double-click', () => config.onShow());

  refreshTray();
  return tray;
}

function refreshTray() {
  if (!tray || tray.isDestroyed()) return;
  buildMenu()
    .then((menu) => {
      if (tray && !tray.isDestroyed()) tray.setContextMenu(menu);
    })
    .catch(() => { /* the menu rebuilds on the next change */ });
}

function destroyTray() {
  if (tray && !tray.isDestroyed()) tray.destroy();
  tray = null;
}

module.exports = { createTray, refreshTray, destroyTray };
