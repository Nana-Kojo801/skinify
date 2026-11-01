import { CountUp } from '@/components/count-up'
import { CONCERN_KEYS, CONCERNS } from '@shared/concerns'
import { describeAgreement, meanGap } from '@shared/scan/photo-agreement'

type LatestScan = { createdAt: number; scores: Record<string, number>; noise: Record<string, number>; qualityFlag: boolean; overall?: number } | undefined
export function LatestScanCard({ scan }: { scan: LatestScan }) {
  if (!scan) return <div className="skeleton min-h-80" aria-label="Loading latest scan" />
  const agreement = describeAgreement(meanGap(scan.noise))
  const date = new Date(scan.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  return <section className="scan-record" aria-label={`Latest scan, ${date}`}>
    <header><span className="kicker">LATEST CHECK-IN <span>/</span> {date}</span><span className="record-quality"><i />{scan.qualityFlag ? 'Lower quality' : agreement.label}</span></header>
    <div className="record-heading"><h2>A moment in<br /><em>your skin.</em></h2>{typeof scan.overall === 'number' && Number.isFinite(scan.overall) ? <div className="overall-score"><CountUp value={Math.round(scan.overall)} /><span>Overall · YouCam estimate</span></div> : <p>Eight observations.<br />One weekly ritual.</p>}</div>
    <ul aria-label="Scores from your latest scan, 1 to 100, higher is healthier" className="score-ledger">{CONCERN_KEYS.filter(key => scan.scores[key] !== undefined).map(key => <li key={key}><span>{CONCERNS[key].label}</span><b><CountUp value={Math.round(scan.scores[key])} /></b><div className="score-track" aria-hidden><i style={{ transform: `scaleX(${scan.scores[key] / 100})` }} /></div></li>)}</ul>
    <p className="record-footnote">Scores out of 100. Compare each concern with its own history.</p>
  </section>
}
