import type { ReactNode } from 'react';

interface SectionHeadProps {
  /** Two-digit index, shown dimmed before the label the way the site numbers its sections. */
  num: string;
  label: string;
  note?: ReactNode;
}

export function SectionHead({ num, label, note }: SectionHeadProps) {
  return (
    <div className="section-head">
      <span className="eyebrow">
        <span className="num">{num}&nbsp;/</span> {label}
      </span>
      {note}
    </div>
  );
}

/** A spec row: wide-tracked mono key, mono value, hairline underneath. */
export function KV({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="kv-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** Resolution figures with the multiplication sign picked out. */
export function Res({ width, height }: { width: number; height: number }) {
  return (
    <>
      {width}<span className="x">×</span>{height}
    </>
  );
}
