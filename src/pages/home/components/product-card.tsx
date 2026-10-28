import { CaretRight } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { Sparkline } from '@/components/sparkline'
import { VerdictPill } from '@/components/verdict-pill'
import { VERDICT_STYLE } from '@/lib/verdict-display'
import { cn } from '@/lib/utils'
import type { Verdict } from '@shared/verdict/verdict-types'

type ProductCardProps = {
  id: string
  image: string
  name: string
  meta: string
  verdict: Verdict | null
  /** The one number that explains the verdict (e.g. "+13.1"), if there is one. */
  stat: string | null
  trend: number[]
  index: number
}

// A row with the product photo on phones; a tall card with the photo on top on desktop.
export function ProductCard({ id, image, name, meta, verdict, stat, trend, index }: ProductCardProps) {
  const style = verdict ? VERDICT_STYLE[verdict] : null
  return (
    <Link
      to={`/products/${id}`}
      className="card press group flex items-center gap-3.5 rounded-[26px] py-3 pr-3.5 pl-3 transition-shadow hover:shadow-(--shadow-float) md:flex-col md:items-stretch md:gap-0 md:p-0"
      style={{ '--i': index } as React.CSSProperties}
    >
      <div className="h-[92px] w-[78px] shrink-0 overflow-hidden rounded-[18px] md:h-48 md:w-auto md:rounded-b-none md:rounded-t-[26px]">
        <img src={image} alt="" loading="lazy" className="size-full object-cover transition-transform duration-700 ease-(--ease-out-soft) group-hover:scale-105" />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-3 md:p-5">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="text-base leading-tight font-semibold md:text-lg">{name}</h3>
          <p className="text-[13px] text-muted">{meta}</p>
          <VerdictPill verdict={verdict} className="mt-1 self-start" />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          {stat && <span className={cn('text-xl font-semibold tracking-[-0.02em]', style?.text)}>{stat}</span>}
          {trend.length >= 2 && style && <Sparkline values={trend} color={style.line} />}
          {!stat && <CaretRight size={20} className="text-muted" />}
        </div>
      </div>
    </Link>
  )
}
