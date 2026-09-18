'use strict';

// Update check against the GitHub releases API. Electron's net module is used
// on purpose: it follows the system proxy, which plain https does not.

const { net, app } = require('electron');

const RELEASES = 'https://api.github.com/repos/ritviksajeev/Qres/releases/latest';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const request = net.request({ method: 'GET', url });
    request.setHeader('Accept', 'application/vnd.github+json');
    request.setHeader('User-Agent', `Qres/${app.getVersion()}`);

    const timeout = setTimeout(() => {
      try { request.abort(); } catch (_) { /* already finished */ }
      reject(new Error('the update check timed out'));
    }, 12000);

    request.on('response', (response) => {
      let body = '';
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        clearTimeout(timeout);
        if (response.statusCode === 404) return reject(new Error('no releases published yet'));
        if (response.statusCode >= 400) return reject(new Error(`GitHub returned ${response.statusCode}`));
        try { resolve(JSON.parse(body)); } catch (_) { reject(new Error('GitHub sent a malformed response')); }
      });
    });

    request.on('error', (err) => { clearTimeout(timeout); reject(err); });
    request.end();
  });
}

// "v1.2.0" / "1.2.0-beta.1" -> comparable tuple. Prereleases sort below their
// own release, which is what you want for "is there something newer".
function parse(version) {
  const clean = String(version || '').trim().replace(/^v/i, '');
  const [core, pre] = clean.split('-');
  const parts = core.split('.').map((n) => parseInt(n, 10) || 0);
  return { parts: [parts[0] || 0, parts[1] || 0, parts[2] || 0], pre: pre || null };
}

function isNewer(candidate, current) {
  const a = parse(candidate);
  const b = parse(current);
  for (let i = 0; i < 3; i++) {
    if (a.parts[i] !== b.parts[i]) return a.parts[i] > b.parts[i];
  }
  if (a.pre && !b.pre) return false;
  if (!a.pre && b.pre) return true;
  if (a.pre && b.pre) return a.pre.localeCompare(b.pre) > 0;
  return false;
}

async function check() {
  const current = app.getVersion();
  const release = await fetchJson(RELEASES);
  const latest = release.tag_name || release.name || '';

  const asset = (release.assets || []).find((a) => /\.(exe|zip|msi)$/i.test(a.name || ''));

  return {
    current,
    latest: String(latest).replace(/^v/i, ''),
    available: isNewer(latest, current),
    notes: release.body || '',
    url: release.html_url || 'https://github.com/ritviksajeev/Qres/releases',
    download: asset ? asset.browser_download_url : null,
    downloadName: asset ? asset.name : null,
    publishedAt: release.published_at || null,
  };
}

module.exports = { check, isNewer };
