import { Scales, SealCheck, WaveSine } from '@phosphor-icons/react'

const POINTS = [
  { icon: Scales, term: 'A steadier score', text: "We average the two, so one unlucky photo can't skew your result." },
  {
    icon: WaveSine,
    term: 'We measure the noise',
    text: 'No two photos are exactly alike: light and angle nudge your numbers a little. The gap between your two shows by how much.',
  },
  {
    icon: SealCheck,
    term: 'Honest verdicts',
    text: 'A product only counts as working if it beats that noise. If your photos disagree a lot, we ask for a retake instead of guessing.',
  },
]

// Answers the first thing people wonder on this page: why not just one photo?
export function WhyTwoPhotos() {
  return (
    <section className="tile p-5 md:p-6" aria-labelledby="why-two-photos">
      <h2 id="why-two-photos" className="text-xl font-semibold tracking-tight">
        Why two photos?
      </h2>
      <ul className="mt-4 flex flex-col gap-4">
        {POINTS.map(({ icon: Icon, term, text }) => (
          <li key={term} className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-well">
              <Icon size={19} weight="bold" />
            </span>
            <span>
              <strong className="block text-base font-semibold">{term}</strong>
              <span className="text-sm leading-snug text-ink-2">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
