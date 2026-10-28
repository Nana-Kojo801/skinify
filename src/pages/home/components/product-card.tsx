import { ArrowUpRight } from '@phosphor-icons/react'
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

// Photo tile with the text on the image, like the reference site's destination tiles.
export function ProductCard({ id, rank, name, concernLabel, startDate, now, verdict, index }: ProductCardProps) {
  const started = startDate <= now
  return (
    <Link
      to={`/products/${id}`}
      className="rise group relative isolate flex aspect-[4/5] w-[80%] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-lg p-5 md:w-auto"
      style={{ '--i': index } as React.CSSProperties}
    >
      <img
        src={productImage(rank)}
        alt=""
        loading="lazy"
        className="absolute inset-0 -z-20 size-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy via-navy/30 to-navy/10" />
      <div>{verdict ? <VerdictBadge verdict={verdict} /> : <span className="rounded-sm bg-navy/70 px-2.5 py-1 text-xs">No verdict yet</span>}</div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-2xl leading-tight font-bold tracking-tight">{name}</h3>
          <p className="mt-1 text-sm text-white/80">
            {concernLabel} · {started ? `day ${daysBetween(startDate, now)}` : 'starts soon'}
          </p>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-sm border border-white/70 transition-colors group-hover:bg-white group-hover:text-navy">
          <ArrowUpRight size={16} weight="bold" />
        </span>
      </div>
    </Link>
  )
}
