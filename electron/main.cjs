'use strict';

const { app, BrowserWindow, ipcMain, shell, nativeImage, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const displays = require('./display.cjs');
const settings = require('./store.cjs');
const hotkeys = require('./hotkeys.cjs');
const profiles = require('./profiles.cjs');
const updates = require('./updates.cjs');
const { createTray, destroyTray, refreshTray } = require('./tray.cjs');

const IS_DEV = !app.isPackaged;
const DEV_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5183';

let win = null;
let quitting = false;
let revert = null;          // { timer, deadline, previous, displayId }

// ---------------------------------------------------------------- window

function createWindow() {
  const saved = settings.get('window') || {};
  const options = {
    width: saved.width || 400,
    height: saved.height || 668,
    minWidth: 360,
    minHeight: 560,
    maxWidth: 560,
    show: false,
    frame: false,
    backgroundColor: settings.get('theme') === 'light' ? '#f4f4f6' : '#050507',
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    icon: iconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  };

  if (Number.isInteger(saved.x) && Number.isInteger(saved.y) && isOnScreen(saved)) {
    options.x = saved.x;
    options.y = saved.y;
  }

  win = new BrowserWindow(options);

  if (IS_DEV) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  win.once('ready-to-show', () => {
    const hidden = settings.get('startMinimized') || process.argv.includes('--hidden');
    if (!hidden) win.show();
  });

  win.on('close', (event) => {
    if (!quitting && settings.get('minimizeToTray')) {
      event.preventDefault();
      win.hide();
      return;
    }
    saveBounds();
  });

  win.on('moved', saveBounds);
  win.on('resized', saveBounds);
  win.on('closed', () => { win = null; });

  // Keep every external link out of the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function isOnScreen(bounds) {
  return screen.getAllDisplays().some((d) => {
    const a = d.workArea;
    return bounds.x < a.x + a.width && bounds.x + 200 > a.x && bounds.y < a.y + a.height && bounds.y + 80 > a.y;
  });
}

function saveBounds() {
  if (!win || win.isDestroyed() || win.isMinimized()) return;
  const b = win.getBounds();
  settings.set('window', { width: b.width, height: b.height, x: b.x, y: b.y });
}

function iconPath() {
  for (const name of ['icon.png', 'icon.ico']) {
    const p = path.join(__dirname, '..', 'build', name);
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

function showWindow() {
  if (!win) return createWindow();
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function toast(message, tone = 'info') {
  send('qr:toast', { message, tone });
}

// ---------------------------------------------------------------- applying

// The single path every resolution change goes through: UI buttons, hotkeys,
// tray items and game profiles all land here so the confirm guard, the toast
// and the tray label stay consistent.
async function applyMode({ width, height, refresh, display, source = 'ui', silent = false }) {
  const state = settings.all();
  const targetId = await displays.resolveTarget(display || state.targetDisplay);
  if (!targetId) throw new Error('No display is attached.');

  const before = (await displays.list()).find((d) => d.id === targetId) || null;
  const chosenRefresh = refresh === undefined || refresh === null ? state.refresh : refresh;

  const result = await displays.apply({
    display: targetId,
    width,
    height,
    refresh: chosenRefresh,
    volatileOnly: !state.persistMode,
  });

  if (!result.ok) {
    if (!silent) toast(result.message || 'The display rejected that mode.', 'error');
    send('qr:applied', { ok: false, ...result });
    return result;
  }

  // Only guard changes made from the window. A hotkey press mid-game should not
  // pull a dialog over the game, and the user already vetted that toggle pair.
  const guard = state.confirmChanges && source === 'ui' && win && win.isVisible();
  if (guard && before) {
    startRevert(targetId, {
      width: before.width,
      height: before.height,
      refresh: before.refresh,
    }, state.confirmSeconds);
  }

  if (!silent) {
    toast(`${width} × ${height}${result.refresh ? ` @ ${result.refresh} Hz` : ''}`, 'ok');
  }

  send('qr:applied', { ok: true, ...result, displayId: targetId });
  await pushState();
  refreshTray();
  return result;
}

function startRevert(displayId, previous, seconds) {
  cancelRevert();
  const deadline = Date.now() + seconds * 1000;
  revert = {
    displayId,
    previous,
    deadline,
    timer: setTimeout(async () => {
      revert = null;
      try {
        await displays.apply({
          display: displayId,
          width: previous.width,
          height: previous.height,
          refresh: previous.refresh,
          volatileOnly: !settings.get('persistMode'),
        });
        toast('Reverted - no confirmation received.', 'warn');
      } catch (err) {
        toast(`Could not revert: ${err.message}`, 'error');
      }
      send('qr:revert-closed', { reverted: true });
      await pushState();
      refreshTray();
    }, seconds * 1000),
  };
  send('qr:revert-open', { previous, seconds, deadline });
}

function cancelRevert() {
  if (revert && revert.timer) clearTimeout(revert.timer);
  revert = null;
}

// ---------------------------------------------------------------- toggle

// Fills in whichever half of the toggle pair the user has not set yet, using
// what the panel actually reports.
function deriveToggle(display) {
  const stored = settings.get('toggle') || {};
  const native = stored.native || {
    width: display.native.width,
    height: display.native.height,
    refresh: 'max',
  };

  let stretched = stored.stretched;
  if (!stretched) {
    // The classic stretched pick: same vertical lines, 4:3 across.
    const height = display.native.height;
    const wanted = Math.round((height * 4) / 3);
    const match = display.resolutions.find((r) => r.height === height && r.width === wanted)
      || display.resolutions.find((r) => r.height === height && r.width < display.native.width)
      || display.resolutions.find((r) => r.width === 1440 && r.height === 1080);
    stretched = match
      ? { width: match.width, height: match.height, refresh: 'max' }
      : { width: 1440, height: 1080, refresh: 'max' };
  }

  return { native, stretched };
}

async function toggleResolution(source = 'hotkey') {
  const display = await displays.currentFor(settings.get('targetDisplay'));
  if (!display) return;

  const { native, stretched } = deriveToggle(display);
  const onStretched = display.width === stretched.width && display.height === stretched.height;
  const next = onStretched ? native : stretched;

  await applyMode({ ...next, display: display.id, source });
}

// ---------------------------------------------------------------- hotkeys

async function rebindHotkeys() {
  const state = settings.all();
  const bindings = [];

  if (state.hotkey && state.hotkey.enabled && state.hotkey.accelerator) {
    bindings.push({
      accelerator: state.hotkey.accelerator,
      run: () => { toggleResolution('hotkey').catch((err) => toast(err.message, 'error')); },
    });
  }

  for (const preset of state.presetHotkeys || []) {
    if (!preset.accelerator || !preset.width || !preset.height) continue;
    bindings.push({
      accelerator: preset.accelerator,
      run: () => {
        applyMode({
          width: preset.width,
          height: preset.height,
          refresh: preset.refresh,
          source: 'hotkey',
        }).catch((err) => toast(err.message, 'error'));
      },
    });
  }

  const result = hotkeys.apply(bindings);
  if (result.failed.length) {
    const first = result.failed[0];
    toast(`Hotkey ${first.accelerator} is ${first.reason}.`, 'warn');
  }
  send('qr:hotkey-state', { active: result.ok, failed: result.failed });
  refreshTray();
  return result;
}

// ---------------------------------------------------------------- profiles

function restartWatcher() {
  profiles.stop();
  if (!settings.get('watcherEnabled')) return;

  profiles.start(() => settings.get('gameProfiles') || [], async (event) => {
    const profile = event.profile;
    try {
      if (event.type === 'started') {
        profile._previous = await displays.currentFor(profile.display || settings.get('targetDisplay'));
        await applyMode({
          width: profile.width,
          height: profile.height,
          refresh: profile.refresh,
          display: profile.display,
          source: 'profile',
          silent: true,
        });
        toast(`${profile.name}: switched to ${profile.width} × ${profile.height}`, 'ok');
      } else if (event.type === 'stopped' && profile.revertOnExit) {
        const display = await displays.currentFor(profile.display || settings.get('targetDisplay'));
        if (display) {
          await applyMode({
            width: display.native.width,
            height: display.native.height,
            refresh: 'max',
            display: display.id,
            source: 'profile',
            silent: true,
          });
          toast(`${profile.name} closed - back to native.`, 'ok');
        }
      }
      send('qr:profile-event', { type: event.type, id: profile.id, name: profile.name });
    } catch (err) {
      toast(`${profile.name}: ${err.message}`, 'error');
    }
  });
}

// ---------------------------------------------------------------- state

async function buildState() {
  let list = [];
  let error = null;
  try {
    list = await displays.list();
  } catch (err) {
    error = err.message;
  }

  const state = settings.all();
  let active = null;
  if (list.length) {
    try {
      const id = await displays.resolveTarget(state.targetDisplay);
      active = list.find((d) => d.id === id) || list.find((d) => d.primary) || list[0];
    } catch (_) {
      active = list.find((d) => d.primary) || list[0];
    }
  }

  return {
    settings: state,
    displays: list,
    activeId: active ? active.id : null,
    toggle: active ? deriveToggle(active) : null,
    hotkeyActive: !!(state.hotkey && state.hotkey.enabled && hotkeys.isRegistered(state.hotkey.accelerator)),
    version: app.getVersion(),
    platform: process.platform,
    error,
  };
}

async function pushState() {
  send('qr:state', await buildState());
}

// ---------------------------------------------------------------- ipc

function registerIpc() {
  ipcMain.handle('qr:get-state', () => buildState());

  ipcMain.handle('qr:refresh-displays', async () => {
    displays.invalidate();
    return buildState();
  });

  ipcMain.handle('qr:apply', async (_e, payload) => {
    try {
      return await applyMode({ ...payload, source: payload.source || 'ui' });
    } catch (err) {
      toast(err.message, 'error');
      return { ok: false, message: err.message };
    }
  });

  ipcMain.handle('qr:toggle', async () => {
    try {
      await toggleResolution('ui');
      return { ok: true };
    } catch (err) {
      toast(err.message, 'error');
      return { ok: false, message: err.message };
    }
  });

  ipcMain.handle('qr:restore', async () => {
    try {
      const result = await displays.restore();
      toast('Every display is back on its Windows default.', 'ok');
      await pushState();
      refreshTray();
      return result;
    } catch (err) {
      toast(err.message, 'error');
      return { ok: false, message: err.message };
    }
  });

  ipcMain.handle('qr:set', async (_e, { key, value }) => {
    settings.set(key, value);

    if (key === 'theme' && win) {
      win.setBackgroundColor(value === 'light' ? '#f4f4f6' : '#050507');
    }
    if (key === 'hotkey' || key === 'presetHotkeys') await rebindHotkeys();
    if (key === 'watcherEnabled' || key === 'gameProfiles') restartWatcher();
    if (key === 'startOnLogin') {
      app.setLoginItemSettings({ openAtLogin: !!value, args: ['--hidden'] });
    }
    if (key === 'targetDisplay') displays.invalidate();

    return buildState();
  });

  ipcMain.handle('qr:confirm-keep', async () => {
    cancelRevert();
    send('qr:revert-closed', { reverted: false });
    return { ok: true };
  });

  ipcMain.handle('qr:confirm-revert', async () => {
    if (!revert) return { ok: true };
    const { displayId, previous } = revert;
    cancelRevert();
    try {
      await displays.apply({
        display: displayId,
        width: previous.width,
        height: previous.height,
        refresh: previous.refresh,
        volatileOnly: !settings.get('persistMode'),
      });
    } catch (err) {
      toast(err.message, 'error');
    }
    send('qr:revert-closed', { reverted: true });
    await pushState();
    refreshTray();
    return { ok: true };
  });

  ipcMain.handle('qr:check-updates', async () => {
    try {
      return { ok: true, ...(await updates.check()) };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  });

  ipcMain.handle('qr:open-external', (_e, url) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
  });

  ipcMain.handle('qr:window', (_e, action) => {
    if (!win) return;
    if (action === 'minimize') win.minimize();
    else if (action === 'hide') win.hide();
    else if (action === 'close') win.close();
  });
}

// ---------------------------------------------------------------- lifecycle

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showWindow);

  app.whenReady().then(async () => {
    app.setAppUserModelId('org.evzero.quickres');

    registerIpc();
    createWindow();

    createTray({
      icon: nativeImage.createFromPath(path.join(__dirname, '..', 'build', 'tray.png')),
      onShow: showWindow,
      onToggle: () => toggleResolution('tray').catch((err) => toast(err.message, 'error')),
      onApply: (mode) => applyMode({ ...mode, source: 'tray' }).catch((err) => toast(err.message, 'error')),
      onRestore: () => displays.restore().then(pushState).catch(() => {}),
      onQuit: () => { quitting = true; app.quit(); },
      getSummary: async () => {
        try {
          const display = await displays.currentFor(settings.get('targetDisplay'));
          if (!display) return null;
          return { display, toggle: deriveToggle(display), hotkey: settings.get('hotkey') };
        } catch (_) {
          return null;
        }
      },
    });

    // Building the helper takes a second the first time; do it off the critical
    // path so the window paints immediately.
    displays.warmUp().then(async () => {
      await pushState();
      refreshTray();
    });

    await rebindHotkeys();
    restartWatcher();

    if (settings.get('startOnLogin')) {
      app.setLoginItemSettings({ openAtLogin: true, args: ['--hidden'] });
    }

    // A monitor being plugged in or unplugged changes everything on screen.
    screen.on('display-added', () => { displays.invalidate(); pushState(); });
    screen.on('display-removed', () => { displays.invalidate(); pushState(); });
    screen.on('display-metrics-changed', () => { displays.invalidate(); pushState(); });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
      else showWindow();
    });
  });

  app.on('before-quit', () => {
    quitting = true;
    cancelRevert();
    saveBounds();
  });

  app.on('will-quit', () => {
    hotkeys.releaseAll();
    profiles.stop();
    destroyTray();
  });

  // The tray keeps QuickRes alive with no windows open - that is the point.
  app.on('window-all-closed', () => {
    if (!settings.get('minimizeToTray')) app.quit();
  });
}
