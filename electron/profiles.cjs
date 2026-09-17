'use strict';

// Game profiles: watch for a process, switch resolution when it appears, put it
// back when it exits. Polling tasklist beats a WMI event subscription here - no
// elevation, no COM, and a 3 s granularity nobody notices on a game launch.

const { execFile } = require('child_process');

const POLL_MS = 3000;

let timer = null;
let running = new Set();
let onEvent = () => {};

function snapshot() {
  return new Promise((resolve) => {
    execFile('tasklist.exe', ['/FO', 'CSV', '/NH'], { windowsHide: true, timeout: 10000, maxBuffer: 8 * 1024 * 1024 },
      (err, stdout) => {
        if (err && !stdout) return resolve(null);
        const names = new Set();
        for (const line of String(stdout).split(/\r?\n/)) {
          const match = /^"([^"]+)"/.exec(line.trim());
          if (match) names.add(match[1].toLowerCase());
        }
        resolve(names);
      });
  });
}

async function tick(getProfiles) {
  const names = await snapshot();
  if (!names) return;                       // tasklist hiccup - try again next tick

  const profiles = getProfiles().filter((p) => p.enabled && p.process);
  const active = new Set();

  for (const profile of profiles) {
    const proc = profile.process.toLowerCase();
    if (names.has(proc)) active.add(profile.id);
  }

  for (const profile of profiles) {
    const isUp = active.has(profile.id);
    const wasUp = running.has(profile.id);
    if (isUp && !wasUp) {
      running.add(profile.id);
      onEvent({ type: 'started', profile });
    } else if (!isUp && wasUp) {
      running.delete(profile.id);
      onEvent({ type: 'stopped', profile });
    }
  }

  // Drop ids for profiles the user deleted while they were running.
  const known = new Set(profiles.map((p) => p.id));
  for (const id of [...running]) if (!known.has(id)) running.delete(id);
}

function start(getProfiles, handler) {
  stop();
  if (process.platform !== 'win32') return;
  onEvent = handler || (() => {});
  running = new Set();
  const loop = () => { tick(getProfiles).catch(() => {}); };
  loop();
  timer = setInterval(loop, POLL_MS);
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  running = new Set();
}

function isWatching() {
  return timer !== null;
}

module.exports = { start, stop, isWatching };
