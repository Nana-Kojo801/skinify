import { WarningCircle } from '@phosphor-icons/react'
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
  /** What the stat measures ("points since start", "noise between photos"). */
  statLabel: string | null
  trend: number[]
  /** Names of other active products on the same concern that started close by (feature: same-concern warning). */
  overlapsWith?: string
}

// A full-width row with the photo on the left on phones; a tall card with the photo on top on desktop.
export function ProductCard({ id, image, name, meta, verdict, stat, statLabel, trend, overlapsWith }: ProductCardProps) {
  const style = verdict ? VERDICT_STYLE[verdict] : null
  return (
    <Link to={`/products/${id}`} className="tile lift press group grid h-full grid-cols-[108px_1fr] overflow-hidden md:flex md:flex-col">
      <div className="relative min-h-[156px] overflow-hidden md:h-[190px] md:min-h-0">
        <img src={image} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-(--ease-liquid) group-hover:scale-105" />
        <VerdictPill verdict={verdict} className="absolute top-3 left-3 hidden shadow-[0_6px_14px_-6px_rgb(0_0_0/0.35)] md:inline-flex" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-4 md:px-5 md:pt-4 md:pb-5">
        <VerdictPill verdict={verdict} className="self-start md:hidden" />
        <h3 className="mt-1 text-base leading-tight font-semibold md:mt-0 md:text-lg">{name}</h3>
        <p className="text-xs text-ink-2">{meta}</p>
        {overlapsWith && (
          <span className="mt-1 flex max-w-full items-start gap-1.5 self-start rounded-2xl bg-canttell-bg px-2.5 py-1 text-xs leading-snug font-semibold text-canttell-ink">
            <WarningCircle size={13} weight="fill" className="mt-0.5 shrink-0" />
            <span className="min-w-0">Overlaps with {overlapsWith}</span>
          </span>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          {stat ? (
            <p className={cn('text-4xl leading-[0.9] font-bold tracking-tighter tabular-nums', verdict === 'WORKING' && style?.text)}>
              {stat}
              {statLabel && <span className="mt-1 block text-xs font-semibold tracking-normal text-ink-3">{statLabel}</span>}
            </p>
          ) : (
            <span />
          )}
          {trend.length >= 2 && style && <Sparkline values={trend} color={style.line} />}
        </div>
      </div>
    </Link>
  )
}
