import { Lightbulb } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CONCERNS } from '@shared/concerns'
import { pickIdeaBlocks, rankLabel } from '@shared/ideas/pick-ideas'

type Props = {
  scores: Record<string, number>
  qualityFlag: boolean
  /** The user's products; undefined while loading. Concerns that already have an active product get no ideas. */
  products: { targetConcern: string; endDate?: number | null }[] | undefined
  /** false for the read-only demo account: the "Test this" buttons are turned off. */
  canCreate: boolean
  /** 'wide': the concerns sit side by side on desktop (full-width tile). 'stack': always one under another. */
  layout?: 'wide' | 'stack'
}

// "Ideas to test": the lowest-scoring concerns of a scan with ingredient families people commonly try (a small
// hand-written list, shared/ideas). Each idea opens the new-product form with the concern and a name pre-filled.
// Wording matters here: these are ideas to try, never advice, and a low score is not a diagnosis.
export function IdeasToTest({ scores, qualityFlag, products, canCreate, layout = 'wide' }: Props) {
  const [now] = useState(() => Date.now())
  if (!products) return null
  const activeConcerns = products.filter((p) => p.endDate == null || p.endDate > now).map((p) => p.targetConcern)
  const blocks = pickIdeaBlocks({ scores, qualityFlag, activeConcerns })
  if (blocks.length === 0) return null

  return (
    <section className="py-5" aria-labelledby="ideas-title">
      <h2 id="ideas-title" className="eyebrow">
        <Lightbulb size={18} weight="bold" />
        Ideas to test
      </h2>
      <p className="mt-2 text-sm leading-snug text-ink-2">
        Your lowest scores this scan, and what people commonly try for them. Try one, and Skinify will tell you honestly whether it worked.
      </p>

      <div className={cn('mt-4 flex flex-col gap-4', layout === 'wide' && 'md:grid xl:grid-cols-3 md:gap-5')}>
        {blocks.map((block) => (
          <div key={block.concern}>
            <div className="flex items-center gap-3">
              <strong className="text-3xl font-medium tabular-nums">{Math.round(block.score)}</strong>
              <div>
                <p className="text-xl leading-tight font-semibold tracking-tight">{CONCERNS[block.concern].label}</p>
                <p className="text-xs font-semibold text-ink-2">{rankLabel(block)}</p>
              </div>
            </div>
            <ul className="mt-3 flex flex-col gap-2">
              {block.ideas.map((idea) => {
                const to = `/products/new?${new URLSearchParams({ concern: block.concern, name: idea.name.replace(/\s*\(.*\)$/, '') })}`
                return (
                  <li key={idea.name} className="flex items-center justify-between gap-3 border-b border-hair py-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{idea.name}</span>
                      <span className="block text-xs leading-snug text-ink-2">{idea.for}</span>
                    </span>
                    {canCreate ? (
                      <Link to={to} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                        Test this
                      </Link>
                    ) : (
                      <span aria-disabled className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'pointer-events-none opacity-45')}>
                        Test this
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
            {block.note && <p className="mt-2 text-xs leading-snug text-ink-2">{block.note}</p>}
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-ink-2">
        These are ideas to try, not advice. A low score doesn't mean you need a product, and scores are estimates from photos. Not sure what suits your
        skin? A pharmacist or dermatologist is the right person to ask.
      </p>
    </section>
  )
}
