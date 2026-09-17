import { KIND_LABEL, type Preset } from '../lib/presets';
import type { DisplayInfo } from '../lib/types';
import { Refresh } from './Icons';

interface QuickResolutionsProps {
  presets: Preset[];
  display: DisplayInfo | null;
  busy: boolean;
  onApply: (preset: Preset) => void;
  onRefresh: () => void;
}

export function QuickResolutions({ presets, display, busy, onApply, onRefresh }: QuickResolutionsProps) {
  return (
    <section className="section">
      <div className="section-head">
        <span className="section-label">Quick resolutions</span>
        <button className="footer-link" onClick={onRefresh} title="Re-read displays" aria-label="Re-read displays">
          <Refresh />
        </button>
      </div>

      <div className="preset-grid">
        {presets.length === 0 ? (
          <div className="preset-empty">No display modes yet.</div>
        ) : (
          presets.map((preset) => {
            const active = !!display && display.width === preset.width && display.height === preset.height;
            return (
              <button
                key={`${preset.width}x${preset.height}`}
                className={`preset${active ? ' active' : ''}`}
                disabled={busy}
                onClick={() => onApply(preset)}
                title={
                  preset.supported
                    ? `Apply ${preset.width} × ${preset.height}`
                    : `${preset.width} × ${preset.height} is not advertised by this display - it needs a custom resolution in your GPU control panel. See the FAQ.`
                }
              >
                <div className="preset-res">
                  {preset.width}x{preset.height}
                  {preset.supported ? null : <span className="preset-dot" />}
                </div>
                <div className="preset-meta">
                  {KIND_LABEL[preset.kind]} · {preset.ratio}
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
