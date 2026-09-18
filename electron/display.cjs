'use strict';

// Display control. Everything that actually touches Win32 goes through the
// little C# helper in native/ - this module owns finding it, building it once,
// and turning its JSON into plain objects.

const { execFile } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const IS_WINDOWS = process.platform === 'win32';
const LIST_CACHE_MS = 1200;

let resolved = null;      // memoised helper location
let listCache = null;     // { at, value }

function nativeDir() {
  // Packaged builds copy native/ next to the asar as an unpacked resource.
  const packaged = path.join(process.resourcesPath || '', 'native');
  if (fs.existsSync(path.join(packaged, 'QresDisplay.cs'))) return packaged;
  return path.join(__dirname, '..', 'native');
}

function binDir() {
  const base = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const dir = path.join(base, 'Qres', 'bin');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function findCsc() {
  const win = process.env.WINDIR || 'C:\\Windows';
  const roots = [
    path.join(win, 'Microsoft.NET', 'Framework64'),
    path.join(win, 'Microsoft.NET', 'Framework'),
  ];
  for (const root of roots) {
    let versions;
    try {
      versions = fs.readdirSync(root).filter((v) => v.startsWith('v4.')).sort().reverse();
    } catch (_) {
      continue;
    }
    for (const v of versions) {
      const csc = path.join(root, v, 'csc.exe');
      if (fs.existsSync(csc)) return csc;
    }
  }
  return null;
}

function compile(source, out, csc) {
  return new Promise((resolve, reject) => {
    execFile(
      csc,
      ['/nologo', '/target:exe', '/platform:anycpu', '/optimize+', '/out:' + out, source],
      { windowsHide: true, timeout: 60000 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error((stderr || stdout || err.message).trim()));
        resolve(out);
      }
    );
  });
}

// Returns { kind: 'exe', exe } or { kind: 'powershell', script }.
async function helper() {
  if (resolved) return resolved;
  if (!IS_WINDOWS) throw new Error('Qres can only change display modes on Windows.');

  const dir = nativeDir();
  const source = path.join(dir, 'QresDisplay.cs');
  if (!fs.existsSync(source)) throw new Error('Display helper source is missing from the install.');

  // Key the cached binary on the source so an app update rebuilds it once.
  const hash = crypto.createHash('sha1').update(fs.readFileSync(source)).digest('hex').slice(0, 10);
  const exe = path.join(binDir(), `qrdisplay-${hash}.exe`);

  if (fs.existsSync(exe)) {
    resolved = { kind: 'exe', exe };
    return resolved;
  }

  const csc = findCsc();
  if (csc) {
    try {
      await compile(source, exe, csc);
      resolved = { kind: 'exe', exe };
      return resolved;
    } catch (err) {
      console.warn('[qres] could not build the display helper, falling back to PowerShell:', err.message);
    }
  }

  const script = path.join(dir, 'qrdisplay.ps1');
  if (!fs.existsSync(script)) throw new Error('No usable display helper: csc.exe is missing and so is the PowerShell fallback.');
  resolved = { kind: 'powershell', script };
  return resolved;
}

function exec(file, args, timeout) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { windowsHide: true, timeout: timeout || 20000, maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
      // The helper reports failures as JSON on stdout and a non-zero exit code,
      // so a populated stdout still wins over the error.
      const out = (stdout || '').trim();
      if (out) return resolve(out);
      reject(new Error(((stderr || '').trim() || (err && err.message) || 'the display helper produced no output')));
    });
  });
}

async function run(args) {
  const h = await helper();
  const timeout = args[0] === 'set' ? 30000 : 20000;

  const out = h.kind === 'exe'
    ? await exec(h.exe, args, timeout)
    : await exec('powershell.exe',
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', h.script, ...args],
        Math.max(timeout, 45000));

  let parsed;
  try {
    parsed = JSON.parse(out);
  } catch (_) {
    throw new Error('Unreadable response from the display helper: ' + out.slice(0, 200));
  }
  if (parsed.ok === false && parsed.error) throw new Error(parsed.error);
  return parsed;
}

async function list({ force } = {}) {
  if (!force && listCache && Date.now() - listCache.at < LIST_CACHE_MS) return listCache.value;
  const res = await run(['list']);
  const displays = (res.displays || []).map(decorate);
  listCache = { at: Date.now(), value: displays };
  return displays;
}

function invalidate() {
  listCache = null;
}

// Adds the derived bits the UI cares about: a readable label, the distinct
// resolutions, and which refresh rates each resolution supports.
function decorate(d) {
  const resolutions = [];
  const byRes = new Map();

  for (const m of d.modes || []) {
    const key = `${m.width}x${m.height}`;
    if (!byRes.has(key)) {
      const entry = { width: m.width, height: m.height, refreshRates: [] };
      byRes.set(key, entry);
      resolutions.push(entry);
    }
    const entry = byRes.get(key);
    if (!entry.refreshRates.includes(m.refresh)) entry.refreshRates.push(m.refresh);
  }

  for (const entry of resolutions) entry.refreshRates.sort((a, b) => b - a);
  resolutions.sort((a, b) => (b.width * b.height) - (a.width * a.height) || b.width - a.width);

  const index = /DISPLAY(\d+)/i.exec(d.id || '');
  const label = d.monitor && d.monitor !== 'Display'
    ? d.monitor
    : `Display ${index ? index[1] : '?'}`;

  return {
    ...d,
    label,
    shortId: index ? `DISPLAY${index[1]}` : d.id,
    resolutions,
    refreshRates: [...new Set((d.modes || []).map((m) => m.refresh))].sort((a, b) => b - a),
  };
}

async function apply({ display, width, height, refresh, volatileOnly, test }) {
  const args = [
    'set',
    '--display', display || 'primary',
    '--width', String(width),
    '--height', String(height),
    '--refresh', refresh === undefined || refresh === null || refresh === 'max' ? 'max' : String(refresh),
  ];
  if (volatileOnly) args.push('--volatile');
  if (test) args.push('--test');

  const res = await run(args);
  if (!test) invalidate();
  return res;
}

async function restore() {
  const res = await run(['restore']);
  invalidate();
  return res;
}

// Which display should a change land on, given the user's target setting?
async function resolveTarget(target) {
  if (!target || target === 'primary') {
    const displays = await list();
    const primary = displays.find((d) => d.primary) || displays[0];
    return primary ? primary.id : null;
  }
  if (target === 'auto' || target === 'cursor') return (await run(['cursor'])).id;
  if (target === 'foreground' || target === 'active') return (await run(['foreground'])).id;
  return target;
}

async function currentFor(target) {
  const id = await resolveTarget(target);
  const displays = await list();
  return displays.find((d) => d.id === id) || displays.find((d) => d.primary) || displays[0] || null;
}

// Warms the helper (and builds it if needed) without blocking startup.
function warmUp() {
  return helper().then(() => list({ force: true })).catch((err) => {
    console.warn('[qres] display warm-up failed:', err.message);
    return null;
  });
}

module.exports = { list, apply, restore, resolveTarget, currentFor, invalidate, warmUp, run };
