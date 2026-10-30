/** Delicate line-art floral sprig in muted gold. */
export function FloralSprig({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 60" className={className} fill="none" stroke="currentColor" strokeWidth="0.8" aria-hidden>
      <path d="M10 30 C 50 30, 70 30, 100 30 C 130 30, 150 30, 190 30" />
      <path d="M100 30 c -6 -10, -2 -18, 0 -22 c 2 4, 6 12, 0 22 Z" />
      <path d="M100 30 c -10 -4, -18 -2, -22 0 c 4 2, 12 6, 22 0 Z" />
      <path d="M100 30 c 10 -4, 18 -2, 22 0 c -4 2, -12 6, -22 0 Z" />
      <circle cx="100" cy="30" r="2" fill="currentColor" />
      <path d="M60 30 c -4 -8, 0 -12, 4 -14" />
      <path d="M140 30 c 4 -8, 0 -12, -4 -14" />
      <path d="M40 30 c 2 6, 6 8, 10 8" />
      <path d="M160 30 c -2 6, -6 8, -10 8" />
    </svg>
  );
}

export function FloralCorner({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" stroke="currentColor" strokeWidth="0.7" aria-hidden>
      <path d="M5 115 C 20 70, 50 40, 115 5" />
      <path d="M30 80 c -10 -6, -14 -16, -10 -22 c 8 2, 14 12, 10 22 Z" />
      <path d="M52 56 c -2 -12, 4 -20, 10 -20 c 2 8, -2 16, -10 20 Z" />
      <path d="M78 34 c 4 -10, 12 -14, 18 -10 c -4 6, -10 10, -18 10 Z" />
      <path d="M40 70 c 10 0, 16 6, 18 12 c -8 0, -16 -4, -18 -12 Z" />
      <path d="M64 46 c 10 2, 14 8, 14 14 c -8 -2, -14 -8, -14 -14 Z" />
      <circle cx="96" cy="16" r="3" />
      <circle cx="18" cy="96" r="2" />
    </svg>
  );
}
