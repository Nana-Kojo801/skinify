// Big number with a small unit beside it, like the reference site's prices ("90 000 € /week").
export function StatFigure({ value, unit, label, size = 'lg' }: { value: string; unit?: string; label: string; size?: 'md' | 'lg' }) {
  return (
    <div className="flex flex-col">
      <span className="flex items-start gap-1 leading-none">
        <span className={`${size === 'lg' ? 'text-5xl' : 'text-4xl'} font-medium tracking-tight tabular-nums`}>{value}</span>
        {unit && <span className="mt-1 text-xs text-muted-foreground">{unit}</span>}
      </span>
      <span className="mt-2 text-sm text-muted-foreground">{label}</span>
    </div>
  )
}
