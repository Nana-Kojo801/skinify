// Brand mark: a coral receipt with a soft scalloped edge and a tick. Same drawing as public/favicon.svg.
export function LogoMark({ className = 'size-[22px]', inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M6 3H18A1 1 0 0 1 19 4V18.6Q18.42 20.3 17.83 18.6Q17.25 20.3 16.67 18.6Q16.08 20.3 15.5 18.6Q14.92 20.3 14.33 18.6Q13.75 20.3 13.17 18.6Q12.58 20.3 12 18.6Q11.42 20.3 10.83 18.6Q10.25 20.3 9.67 18.6Q9.08 20.3 8.5 18.6Q7.92 20.3 7.33 18.6Q6.75 20.3 6.17 18.6Q5.58 20.3 5 18.6V4A1 1 0 0 1 6 3Z"
        fill={inverted ? '#ffffff' : 'var(--color-coral)'}
      />
      <path
        d="M8.5 12.5l2.5 2.3 4.5-5"
        fill="none"
        stroke={inverted ? 'var(--color-coral)' : '#ffffff'}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-xl font-bold tracking-[-0.03em]">
      <LogoMark inverted={inverted} />
      receipts
    </span>
  )
}
