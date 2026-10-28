import { Link } from 'react-router'
import { VerdictBadge } from '@/components/verdict-badge'
import { daysBetween } from '@/lib/format'
import { productImage } from '@/lib/product-image'
import type { Verdict } from '@shared/verdict/verdict-types'

type ProductCardProps = {
  id: string
  rank: number
  name: string
  concernLabel: string
  startDate: number
  now: number
  verdict: Verdict | null
  index: number
}

export function ProductCard({ id, rank, name, concernLabel, startDate, now, verdict, index }: ProductCardProps) {
  const started = startDate <= now
  return (
    <Link
      to={`/products/${id}`}
      className="rise surface group block overflow-hidden transition-transform active:scale-[0.99]"
      style={{ '--i': index } as React.CSSProperties}
    >
      <img
        src={productImage(rank)}
        alt=""
        loading="lazy"
        className="h-32 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <div className="flex flex-col gap-3 p-4">
        <h3 className="text-lg leading-snug font-semibold tracking-tight">{name}</h3>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {concernLabel}, {started ? `day ${daysBetween(startDate, now)}` : 'not started yet'}
          </p>
          {verdict ? <VerdictBadge verdict={verdict} /> : <span className="text-xs text-muted-foreground">No verdict yet</span>}
        </div>
      </div>
    </Link>
  )
}
