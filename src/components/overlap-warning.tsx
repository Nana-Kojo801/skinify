import { WarningCircle } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { joinNames, startedPhrase, type Overlap } from '@shared/products/overlap'

type Props = {
  overlaps: readonly Overlap[]
  /** Lower-case concern name, e.g. "moisture". */
  concern: string
  /** 'form': the product is not saved yet. */
  variant?: 'page' | 'form'
  className?: string
}

// "You're also testing X for the same concern": the verdict can't tell overlapping products apart. A heads-up only.
export function OverlapWarning({ overlaps, concern, variant = 'page', className }: Props) {
  if (overlaps.length === 0) return null
  const names = joinNames(overlaps.map((o) => o.name))
  return (
    <p
      role="note"
      className={cn('flex items-start gap-3 rounded-[22px] bg-[image:var(--sheen)] bg-canttell-bg px-4 py-3.5 text-[14.5px] leading-snug text-canttell-ink shadow-(--shadow-depth-color)', className)}
    >
      <WarningCircle size={20} weight="fill" className="mt-0.5 shrink-0" />
      {variant === 'form' ? (
        <span>
          <strong className="block font-bold">
            You already have {names} active for {concern}
          </strong>
          Started {startedPhrase(overlaps)}. Testing more than one now makes it hard to tell which one works. You can still add it.
        </span>
      ) : (
        <span>
          <strong className="block font-bold">
            You're also testing {names} for {concern}
          </strong>
          Started {startedPhrase(overlaps)}. If {concern} changes, {overlaps.length === 1 ? 'either product' : 'any of them'} could be the cause, so this verdict
          can't tell them apart.
        </span>
      )}
    </p>
  )
}
