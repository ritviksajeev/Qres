'use strict';

// Tray, plus its menu.
//
// Electron's Menu is drawn by the OS, so it cannot carry the app's theme - it
// would always be a grey Windows context menu hanging off a purple app. The
// menu here is therefore a small frameless window rendering the same React and
// the same tokens as everything else.

const { Tray, BrowserWindow, screen, nativeImage, app } = require('electron');
const path = require('path');

const MIN_WIDTH = 240;
const MAX_WIDTH = 320;

let tray = null;
let menuWin = null;
let config = null;
let model = null;          // last-built menu model, served to the popup on load

function label(mode) {
  if (!mode) return '-';
  const hz = mode.refresh && mode.refresh !== 'max' ? ` @ ${mode.refresh} Hz` : '';
  return `${mode.width} × ${mode.height}${hz}`;
}

async function buildModel() {
  const summary = config.getSummary ? await config.getSummary() : null;
  const items = [];

  if (summary && summary.display) {
    const d = summary.display;
    items.push({
      type: 'header',
      label: d.label,
      value: `${d.width} × ${d.height} · ${d.refresh}Hz`,
    });
    items.push({ type: 'separator' });
    items.push({
      type: 'item',
      id: 'toggle',
      label: 'Toggle',
      hint: summary.hotkey && summary.hotkey.enabled ? summary.hotkey.accelerator : null,
      accent: true,
    });
    items.push({ type: 'item', id: 'native', label: 'Native', value: label(summary.toggle.native) });
    items.push({ type: 'item', id: 'stretched', label: 'Stretched', value: label(summary.toggle.stretched) });
  } else {
    items.push({ type: 'header', label: 'Qres', value: 'reading displays…' });
  }

  items.push({ type: 'separator' });
  items.push({ type: 'item', id: 'open', label: 'Open Qres' });
  items.push({ type: 'item', id: 'restore', label: 'Restore Windows defaults' });
  items.push({ type: 'separator' });
  items.push({ type: 'item', id: 'quit', label: 'Quit Qres', danger: true });

  return {
    items,
    theme: (summary && summary.theme) || 'dark',
    version: app.getVersion(),
  };
}

function createMenuWindow() {
  menuWin = new BrowserWindow({
    width: MIN_WIDTH,
    height: 240,
    show: false,
    frame: false,
    // The menu card itself is opaque; the window is transparent only so its
    // rounded corners and drop shadow are not drawn on a grey rectangle.
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: true,
    acceptFirstMouse: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  menuWin.setAlwaysOnTop(true, 'pop-up-menu');
  menuWin.setMenu(null);

  if (config.devUrl) {
    menuWin.loadURL(`${config.devUrl}#traymenu`);
  } else {
    menuWin.loadFile(config.indexFile, { hash: 'traymenu' });
  }

  // Clicking anywhere else dismisses it, the way a menu should.
  menuWin.on('blur', hideMenu);
  menuWin.on('closed', () => { menuWin = null; });

  menuWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

function hideMenu() {
  if (menuWin && !menuWin.isDestroyed() && menuWin.isVisible()) menuWin.hide();
}

// Anchors the menu to the tray icon, kept inside the work area so it never
// straddles a screen edge or sits under the taskbar.
function place(width, height) {
  if (!menuWin || menuWin.isDestroyed()) return;

  const iconBounds = tray && !tray.isDestroyed() ? tray.getBounds() : null;
  const anchor = iconBounds && iconBounds.width
    ? { x: iconBounds.x + iconBounds.width / 2, y: iconBounds.y + iconBounds.height / 2 }
    : screen.getCursorScreenPoint();

  const area = screen.getDisplayNearestPoint(anchor).workArea;

  let x = Math.round(anchor.x - width / 2);
  x = Math.max(area.x + 8, Math.min(x, area.x + area.width - width - 8));

  // Above the icon when the taskbar is at the bottom, below it otherwise.
  const below = anchor.y < area.y + area.height / 2;
  let y = below ? Math.round(anchor.y + 16) : Math.round(anchor.y - height - 16);
  y = Math.max(area.y + 8, Math.min(y, area.y + area.height - height - 8));

  menuWin.setBounds({ x, y, width, height });
}

async function showMenu() {
  if (!menuWin || menuWin.isDestroyed()) createMenuWindow();

  model = await buildModel();
  if (!menuWin || menuWin.isDestroyed()) return;

  // The popup pulls the model itself once it is ready; if it is already loaded,
  // push the refreshed one so a reopened menu is never stale.
  menuWin.webContents.send('qr:tray-menu-model', model);

  place(menuWin.getBounds().width || MIN_WIDTH, menuWin.getBounds().height || 240);
  menuWin.showInactive();
  menuWin.focus();
}

/** The popup reports the size it actually needs once React has laid it out. */
function resizeMenu(width, height) {
  const w = Math.round(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width)));
  const h = Math.round(Math.max(80, height));
  place(w, h);
}

function currentModel() {
  return model;
}

function handleAction(id) {
  hideMenu();
  switch (id) {
    case 'toggle':    return config.onToggle();
    case 'native':    return config.onApplyToggle('native');
    case 'stretched': return config.onApplyToggle('stretched');
    case 'open':      return config.onShow();
    case 'restore':   return config.onRestore();
    case 'quit':      return config.onQuit();
    default:          return undefined;
  }
}

function createTray(options) {
  config = options;

  let icon = options.icon;
  if (!icon || icon.isEmpty()) icon = nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip('Qres');

  tray.on('click', () => { hideMenu(); config.onShow(); });
  tray.on('right-click', () => { showMenu().catch(() => {}); });

  createMenuWindow();
  return tray;
}

// Kept for call sites that refresh after a mode change; the menu rebuilds its
// model every time it opens, so this only needs to invalidate the cache.
function refreshTray() {
  model = null;
  if (menuWin && !menuWin.isDestroyed() && menuWin.isVisible()) showMenu().catch(() => {});
}

function destroyTray() {
  if (menuWin && !menuWin.isDestroyed()) menuWin.destroy();
  menuWin = null;
  if (tray && !tray.isDestroyed()) tray.destroy();
  tray = null;
}

module.exports = { createTray, refreshTray, destroyTray, showMenu, hideMenu, resizeMenu, handleAction, currentModel };
