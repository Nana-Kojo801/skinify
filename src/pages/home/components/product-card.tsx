import { ArrowUpRight, WarningCircle } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { Sparkline } from '@/components/sparkline'
import { VerdictPill } from '@/components/verdict-pill'
import { VERDICT_STYLE } from '@/lib/verdict-display'
import type { Verdict } from '@shared/verdict/verdict-types'

type ProductCardProps = { id: string; image: string; name: string; meta: string; verdict: Verdict | null; stat: string | null; statLabel: string | null; trend: number[]; overlapsWith?: string }
export function ProductCard({ id, name, meta, verdict, stat, statLabel, trend, overlapsWith }: ProductCardProps) {
  const style = verdict ? VERDICT_STYLE[verdict] : null
  return <Link to={`/products/${id}`} className="product-entry">
    <div className="product-bottle" aria-hidden><svg width="25" height="40" viewBox="0 0 25 40" fill="none"><path d="M9 2h7v7H9zM7 9h11v4H7zM7 13h11l4 6v18H3V19l4-6Z" stroke="currentColor" strokeWidth="1.3" /><path d="M3 24h19M3 31h19M9 27.5h7" stroke="currentColor" strokeWidth="1.3" /></svg></div>
    <div className="product-entry-name"><h3>{name}</h3><p>{meta}</p>{overlapsWith && <span className="overlap-label"><WarningCircle size={14} />Overlaps with {overlapsWith}</span>}</div>
    <VerdictPill verdict={verdict} className="product-entry-verdict" />
    <div className="product-entry-trend">{trend.length >= 2 && style && <Sparkline values={trend} color={style.line} />}</div>
    <div className="product-entry-stat"><strong>{stat ?? '—'}</strong><span>{statLabel ?? 'Building your baseline'}</span></div>
    <ArrowUpRight className="product-entry-arrow" size={20} />
  </Link>
}
