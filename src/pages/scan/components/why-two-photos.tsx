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
    <section className="card p-5" aria-labelledby="why-two-photos">
      <h2 id="why-two-photos" className="text-[17px] font-semibold tracking-[-0.02em]">
        Why two photos?
      </h2>
      <ul className="mt-3.5 flex flex-col gap-4">
        {POINTS.map(({ icon: Icon, term, text }) => (
          <li key={term} className="flex gap-3.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sand text-coral-ink">
              <Icon size={19} />
            </span>
            <span>
              <span className="block text-[15px] font-semibold">{term}</span>
              <span className="mt-0.5 block text-[13.5px] leading-snug text-muted">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
