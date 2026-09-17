'use strict';

// Global hotkey registration. Electron's globalShortcut is process-wide, so this
// module keeps one registry and re-applies the whole set whenever anything
// changes - simpler than tracking individual bindings and it cannot drift.

const { globalShortcut } = require('electron');

let registered = [];

function normalise(accelerator) {
  return String(accelerator || '').trim();
}

// Registers every binding in `bindings` ([{ accelerator, run }]).
// Returns { ok, failed } so the UI can flag a hotkey another app already owns.
function apply(bindings) {
  releaseAll();

  const ok = [];
  const failed = [];

  for (const binding of bindings) {
    const accelerator = normalise(binding.accelerator);
    if (!accelerator) continue;
    if (ok.includes(accelerator)) {
      failed.push({ accelerator, reason: 'assigned twice' });
      continue;
    }

    let success = false;
    try {
      success = globalShortcut.register(accelerator, binding.run);
    } catch (err) {
      failed.push({ accelerator, reason: err.message });
      continue;
    }

    if (success) {
      ok.push(accelerator);
      registered.push(accelerator);
    } else {
      failed.push({ accelerator, reason: 'already taken by another app' });
    }
  }

  return { ok, failed };
}

function releaseAll() {
  for (const accelerator of registered) {
    try { globalShortcut.unregister(accelerator); } catch (_) { /* already gone */ }
  }
  registered = [];
}

function isRegistered(accelerator) {
  return registered.includes(normalise(accelerator));
}

module.exports = { apply, releaseAll, isRegistered };
