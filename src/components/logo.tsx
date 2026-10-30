// Brand mark: a rounded iOS-blue tile with a white tick. Same drawing as public/favicon.svg and the PWA icons.
export function LogoMark({ className = 'size-9', inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <svg viewBox="0 0 36 36" className={className} aria-hidden>
      <defs>
        <linearGradient id="logo-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={inverted ? 0.5 : 0.28} />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="36" height="36" rx="12" fill={inverted ? '#ffffff' : 'var(--color-primary)'} />
      <rect width="36" height="36" rx="12" fill="url(#logo-sheen)" />
      <path d="M11.5 18.5l4.2 4 8.8-9" fill="none" stroke={inverted ? 'var(--color-primary)' : '#ffffff'} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 text-[22px] font-extrabold tracking-[-0.03em] ${inverted ? 'text-white' : 'text-ink'}`}>
      <LogoMark inverted={inverted} />
      Receipts
    </span>
  )
}
