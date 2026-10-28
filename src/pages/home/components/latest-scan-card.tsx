import { ScanSmiley } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { ScoreRing } from '@/components/score-ring'
import { buttonVariants } from '@/components/ui/button'
import { CONCERN_KEYS, CONCERNS } from '@shared/concerns'

type LatestScan = { createdAt: number; scores: Record<string, number>; qualityFlag: boolean } | null | undefined

// The newest scan: a skin photo with a white card of score rings overlapping it.
// Empty state explains why the first scan matters.
export function LatestScanCard({ scan, canScan }: { scan: LatestScan; canScan: boolean }) {
  if (scan === undefined) {
    return (
      <div aria-hidden>
        <div className="skeleton h-[210px] md:h-[250px]" />
        <div className="skeleton relative mx-3 -mt-16 h-48 bg-line" />
      </div>
    )
  }
  return (
    <div className="relative">
      <div className="photo relative h-[210px] overflow-hidden rounded-(--radius-card) md:h-[250px]">
        <img src="/images/skin-texture.webp" alt="" className="settle size-full object-cover object-[50%_60%]" />
        <div className="absolute top-[18px] left-5 text-white">
          <p className="text-[13px] font-semibold opacity-90">{scan ? 'Latest scan' : 'No scans yet'}</p>
          <p className="mt-0.5 text-2xl font-semibold tracking-[-0.02em]">
            {scan ? new Date(scan.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) : 'Start today'}
          </p>
        </div>
      </div>
      {scan ? (
        <div className="card relative mx-3 -mt-16 px-2.5 pt-5 pb-4 shadow-(--shadow-raised) md:px-4 md:pt-6">
          <ul className="grid grid-cols-4 gap-y-4">
            {CONCERN_KEYS.filter((key) => scan.scores[key] !== undefined).map((key, index) => (
              <li key={key}>
                <ScoreRing value={scan.scores[key]} label={CONCERNS[key].label} index={index} />
              </li>
            ))}
          </ul>
          <p className="mt-3.5 text-center text-[12.5px] text-muted">
            Scores run 1 to 100. Higher is healthier.{scan.qualityFlag ? ' This scan is marked as lower quality.' : ''}
          </p>
        </div>
      ) : (
        <div className="card relative mx-3 -mt-16 p-5 shadow-(--shadow-raised) md:p-6">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">Your first scan sets your baseline</h2>
          <p className="mt-1 text-[15px] text-muted">Scan before you start a product, so there is something to compare against.</p>
          {canScan && (
            <Link to="/scan" className={buttonVariants({ className: 'mt-4' })}>
              <ScanSmiley size={20} />
              New scan
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
