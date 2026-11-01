export function LogoMark({ className = 'size-5' }: { className?: string; inverted?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M3 10h7v11H3zM14 3h7v18h-7z" fill="var(--color-primary)" />
      <path d="M3 5h7v2H3z" fill="var(--color-primary)" />
    </svg>
  )
}

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return <span className={`brand ${inverted ? 'text-white' : ''}`}>receipts<LogoMark /></span>
}
