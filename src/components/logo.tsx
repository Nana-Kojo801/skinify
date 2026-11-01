export function LogoMark({ className = 'size-9', inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <svg viewBox="0 0 36 36" className={className} fill="none" aria-hidden>
      <path d="M9 4h18v28l-4.5-3-4.5 3-4.5-3L9 32V4Z" stroke={inverted ? '#e1e8d5' : 'var(--color-primary)'} strokeWidth="1.6" />
      <path d="m13 17 3.5 3.5 7-8M13 9h10M13 25h10" stroke={inverted ? '#e1e8d5' : 'var(--color-primary)'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
export function Logo({ inverted = false }: { inverted?: boolean }) {
  return <span className={`brand inline-flex items-center gap-2 ${inverted ? 'text-white' : 'text-ink'}`}><LogoMark inverted={inverted} />receipts<span className="brand-dot">.</span></span>
}
