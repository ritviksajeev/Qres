import type { DisplayInfo, RefreshChoice, ResolutionEntry } from './types';

export type PresetKind = 'native' | 'stretched' | 'lower' | 'higher' | 'scaled';

export interface Preset {
  width: number;
  height: number;
  kind: PresetKind;
  ratio: string;
  /** False when the display does not advertise this mode - it may still work through GPU scaling. */
  supported: boolean;
}

// Monitors get sold by these names, so a mode that lands on one should say so
// rather than print its reduced fraction (1728×1080 is 16:10, not 8:5).
const NAMED_RATIOS: [number, string][] = [
  [32 / 9, '32:9'],
  [21 / 9, '21:9'],
  [16 / 9, '16:9'],
  [16 / 10, '16:10'],
  [3 / 2, '3:2'],
  [4 / 3, '4:3'],
  [5 / 4, '5:4'],
  [1, '1:1'],
];

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function ratioOf(width: number, height: number): string {
  const value = width / height;
  for (const [target, name] of NAMED_RATIOS) {
    if (Math.abs(value - target) < 0.012) return name;
  }
  const divisor = gcd(width, height) || 1;
  return `${width / divisor}:${height / divisor}`;
}

function sameRatio(a: { width: number; height: number }, b: { width: number; height: number }): boolean {
  return Math.abs(a.width / a.height - b.width / b.height) < 0.01;
}

export function classify(
  width: number,
  height: number,
  native: { width: number; height: number },
): PresetKind {
  if (width === native.width && height === native.height) return 'native';
  // Same vertical lines, fewer horizontal ones: the shape every stretched-res
  // player is after once GPU scaling fills the panel.
  if (height === native.height && width < native.width) return 'stretched';
  if (sameRatio({ width, height }, native)) {
    return width * height < native.width * native.height ? 'lower' : 'higher';
  }
  return 'scaled';
}

export const KIND_LABEL: Record<PresetKind, string> = {
  native: 'NATIVE',
  stretched: 'STRETCHED',
  lower: 'LOW',
  higher: 'HIGH',
  scaled: 'SCALED',
};

// Widths worth offering even when the panel does not advertise them - a custom
// resolution in the GPU control panel makes them real, and the FAQ says so.
const STRETCH_RATIOS = [4 / 3, 3 / 2, 16 / 10, 5 / 4];

/**
 * The six tiles in the quick grid: native first, then the stretched widths that
 * keep the panel's vertical lines, then same-shape lower resolutions.
 */
export function buildPresets(display: DisplayInfo | null, limit = 6): Preset[] {
  if (!display) return [];

  const native = display.native;
  const supported = new Set(display.resolutions.map((r) => `${r.width}x${r.height}`));
  const isSupported = (w: number, h: number) => supported.has(`${w}x${h}`);

  const out: Preset[] = [];
  const seen = new Set<string>();

  const push = (width: number, height: number) => {
    const key = `${width}x${height}`;
    if (seen.has(key) || width < 640 || height < 480) return;
    seen.add(key);
    out.push({
      width,
      height,
      kind: classify(width, height, native),
      ratio: ratioOf(width, height),
      supported: isSupported(width, height),
    });
  };

  push(native.width, native.height);

  // Stretched: whatever the panel already lists at native height, then the
  // classic ratios to fill the row out.
  const listedStretched = display.resolutions
    .filter((r) => r.height === native.height && r.width < native.width)
    .sort((a, b) => b.width - a.width);

  for (const entry of listedStretched.slice(0, 3)) push(entry.width, entry.height);

  for (const ratio of STRETCH_RATIOS) {
    if (out.filter((p) => p.kind === 'stretched').length >= 3) break;
    const width = Math.round((native.height * ratio) / 2) * 2;
    if (width < native.width) push(width, native.height);
  }

  // Same-shape lower resolutions for when you want frames rather than pixels.
  const lower = display.resolutions
    .filter((r) => sameRatio(r, native) && r.width * r.height < native.width * native.height)
    .sort((a, b) => b.width * b.height - a.width * a.height);

  for (const entry of lower) {
    if (out.length >= limit) break;
    push(entry.width, entry.height);
  }

  return out.slice(0, limit);
}

export function refreshRatesFor(display: DisplayInfo | null, width: number, height: number): number[] {
  if (!display) return [];
  const entry: ResolutionEntry | undefined = display.resolutions.find(
    (r) => r.width === width && r.height === height,
  );
  return entry ? entry.refreshRates : [];
}

export function formatRefresh(refresh: RefreshChoice, resolved?: number): string {
  if (refresh === 'max') return resolved ? `${resolved} Hz (max)` : 'Max';
  return `${refresh} Hz`;
}

export function parseResolution(input: string): { width: number; height: number } | null {
  const match = /^\s*(\d{3,5})\s*[x×*: ]\s*(\d{3,5})\s*$/i.exec(input);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (width < 640 || height < 480 || width > 16384 || height > 16384) return null;
  return { width, height };
}
