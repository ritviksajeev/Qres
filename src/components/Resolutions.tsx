import { KIND_LABEL, type Preset } from '../lib/presets';
import type { DisplayInfo } from '../lib/types';
import { SectionHead, Res } from './SectionHead';
import { Refresh } from './Icons';

interface ResolutionsProps {
  presets: Preset[];
  display: DisplayInfo | null;
  busy: boolean;
  onApply: (preset: Preset) => void;
  onRefresh: () => void;
}

export function Resolutions({ presets, display, busy, onApply, onRefresh }: ResolutionsProps) {
  return (
    <section className="section">
      <SectionHead
        num="01"
        label="Resolutions"
        note={
          <button className="head-btn" onClick={onRefresh} title="Re-read displays" aria-label="Re-read displays">
            <Refresh />
          </button>
        }
      />

      <div className="preset-grid">
        {presets.length === 0 ? (
          <div className="preset-empty">No display modes yet</div>
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
                {preset.supported ? null : <span className="preset-flag" />}
                <div className="preset-res"><Res width={preset.width} height={preset.height} /></div>
                <div className="preset-meta">
                  {KIND_LABEL[preset.kind]}
                  <span className="sep" />
                  {preset.ratio}
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
