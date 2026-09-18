/**
 * The viewBox is cropped to the glyph's own stroke bounds rather than a square
 * canvas, so the rendered box IS the visual box - that is what lets the mark
 * sit level with the wordmark instead of floating inside its own padding.
 */
export function Mark({ height = 12 }: { height?: number }) {
  const width = Math.round((height * 22.7) / 17.1);
  return (
    <svg width={width} height={height} viewBox="0.65 3.45 22.7 17.1" fill="none" aria-hidden="true">
      <rect x="1.6" y="4.4" width="20.8" height="15.2" rx="3" stroke="currentColor" strokeWidth="1.9" />
      <path d="M8.2 12h7.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity="0.75" />
      <path d="M8.6 9.6 6 12l2.6 2.4M15.4 9.6 18 12l-2.6 2.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
    </svg>
  );
}

export function Minimize() {
  return <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 5h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;
}

export function Restore() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><rect x="1.2" y="1.2" width="7.6" height="7.6" rx="1" stroke="currentColor" strokeWidth="1.2" /></svg>;
}

export function Close() {
  return <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;
}

export function Back() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function Sliders() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 7.5h12M18.5 7.5H21M3 16.5h4.5M11 16.5h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="16.6" cy="7.5" r="2.1" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9.2" cy="16.5" r="2.1" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function Sun() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 2v2.4M12 19.6V22M22 12h-2.4M4.4 12H2M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7M19.1 19.1l-1.7-1.7M6.6 6.6 4.9 4.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function Moon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 14.4A8.4 8.4 0 0 1 9.6 4 8.4 8.4 0 1 0 20 14.4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>;
}

export function Refresh() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20.6 3.6v4.6H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Trash() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6.5h16M9.5 6.5V4.2h5v2.3M6.6 6.5l.9 13.3h9l.9-13.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GitHub() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1.16-.02-2.1-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.06.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

export function Warning() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flex: 'none', marginTop: 1 }}>
      <path d="M12 3.6 22 20.4H2L12 3.6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 10v4.2M12 17.2v.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
