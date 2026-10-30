import { Lightbulb } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link } from 'react-router'
import { ScoreRing } from '@/components/score-ring'
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
}

// "Ideas to test": the lowest-scoring concerns of a scan with ingredient families people commonly try (a small
// hand-written list, shared/ideas). Each idea opens the new-product form with the concern and a name pre-filled.
// Wording matters here: these are ideas to try, never advice, and a low score is not a diagnosis.
export function IdeasToTest({ scores, qualityFlag, products, canCreate }: Props) {
  const [now] = useState(() => Date.now())
  if (!products) return null
  const activeConcerns = products.filter((p) => p.endDate == null || p.endDate > now).map((p) => p.targetConcern)
  const blocks = pickIdeaBlocks({ scores, qualityFlag, activeConcerns })
  if (blocks.length === 0) return null

  return (
    <section className="card p-5 md:p-6" aria-labelledby="ideas-title">
      <h2 id="ideas-title" className="flex items-center gap-2 text-xl font-semibold tracking-[-0.02em]">
        <Lightbulb size={22} />
        Ideas to test
      </h2>
      <p className="mt-1.5 text-[15px] text-muted">
        Your lowest scores this scan, and what people commonly try for them. Try one, and Receipts will tell you honestly whether it worked.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {blocks.map((block) => (
          <div key={block.concern} className="tile p-3.5">
            <div className="flex items-center gap-3">
              <ScoreRing value={block.score} size={46} numberClassName="text-[14px]" />
              <div>
                <p className="font-semibold">{CONCERNS[block.concern].label}</p>
                <p className="text-[12.5px] text-muted">{rankLabel(block)}</p>
              </div>
            </div>
            <ul className="mt-1.5">
              {block.ideas.map((idea) => {
                const to = `/products/new?${new URLSearchParams({ concern: block.concern, name: idea.name.replace(/\s*\(.*\)$/, '') })}`
                return (
                  <li key={idea.name} className="flex items-center justify-between gap-3 border-t border-nude py-2.5 first:border-t-0">
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold">{idea.name}</span>
                      <span className="block text-[12.5px] text-muted">{idea.for}</span>
                    </span>
                    {canCreate ? (
                      <Link to={to} className={buttonVariants({ size: 'sm' })}>
                        Test this
                      </Link>
                    ) : (
                      <span aria-disabled className={cn(buttonVariants({ size: 'sm' }), 'pointer-events-none opacity-45')}>
                        Test this
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
            {block.note && <p className="mt-1.5 text-[12.5px] text-cocoa-soft">{block.note}</p>}
          </div>
        ))}
      </div>

      <p className="mt-4 px-0.5 text-[12.5px] leading-relaxed text-muted">
        These are ideas to try, not advice. A low score doesn't mean you need a product, and scores are estimates from photos. Not sure what suits your
        skin? A pharmacist or dermatologist is the right person to ask.
      </p>
    </section>
  )
}
