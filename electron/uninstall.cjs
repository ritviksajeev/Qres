'use strict';

// Uninstall. Two shapes of install need two endings:
//
//   installed  - NSIS wrote an uninstaller next to the exe and an entry in
//                Add/Remove Programs. Hand off to it and quit.
//   portable   - there is nothing registered to remove, so the best we can do
//                is erase everything Qres wrote outside its own folder and
//                tell the user which folder to delete.
//
// Either way the data Qres created elsewhere is removed first, because the NSIS
// uninstaller does not know about %APPDATA%\Qres or the cached display helper.

const { app } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function installDir() {
  return path.dirname(app.getPath('exe'));
}

// electron-builder's NSIS target writes "Uninstall <productName>.exe".
function findUninstaller() {
  if (process.platform !== 'win32' || !app.isPackaged) return null;
  const dir = installDir();
  let entries;
  try {
    entries = fs.readdirSync(dir);
  } catch (_) {
    return null;
  }
  const match = entries.find((name) => /^Uninstall .*\.exe$/i.test(name));
  return match ? path.join(dir, match) : null;
}

function dataPaths() {
  const local = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return [
    app.getPath('userData'),            // %APPDATA%\Qres - settings
    path.join(local, 'Qres'),           // cached display helper
  ];
}

function removed(target) {
  try {
    fs.rmSync(target, { recursive: true, force: true });
    return true;
  } catch (_) {
    return false;
  }
}

/** Erases settings, the cached helper and the login item. */
function purge() {
  const failed = [];

  try {
    app.setLoginItemSettings({ openAtLogin: false });
  } catch (_) {
    failed.push('the start-with-Windows entry');
  }

  for (const target of dataPaths()) {
    if (fs.existsSync(target) && !removed(target)) failed.push(target);
  }

  return failed;
}

/** What the confirmation dialog needs to describe before anything is deleted. */
function plan() {
  const uninstaller = findUninstaller();
  return {
    kind: uninstaller ? 'installed' : 'portable',
    folder: app.isPackaged ? installDir() : null,
    paths: dataPaths().filter((p) => fs.existsSync(p)),
  };
}

/**
 * Runs the uninstall. Resolves with what the user still has to do by hand -
 * the caller quits the app afterwards.
 */
function run() {
  const uninstaller = findUninstaller();
  const failed = purge();

  if (uninstaller) {
    try {
      // Detached, because this process is about to exit and the uninstaller
      // must outlive it to delete the exe.
      spawn(uninstaller, ['/currentuser'], { detached: true, stdio: 'ignore' }).unref();
      return { kind: 'installed', handedOff: true, failed };
    } catch (err) {
      return { kind: 'installed', handedOff: false, failed, error: err.message };
    }
  }

  return { kind: 'portable', handedOff: false, failed, folder: app.isPackaged ? installDir() : null };
}

module.exports = { plan, run, purge, findUninstaller };
