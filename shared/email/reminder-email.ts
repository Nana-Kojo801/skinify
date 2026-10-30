export type ReminderEmailInput = {
  /** Already formatted for the reader, e.g. "Fri, Nov 6". */
  dueLabel: string
  appUrl: string
  unsubscribeUrl: string
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * The weekly scan reminder. No scores, no health information: only that a scan is due, a link, why the email
 * was sent and how to stop it. Used for the real email and for the preview in Settings.
 */
export function buildReminderEmail({ dueLabel, appUrl, unsubscribeUrl }: ReminderEmailInput) {
  const subject = 'Time for your weekly scan'
  const scanUrl = `${appUrl.replace(/\/$/, '')}/scan`
  const why = 'You are getting this because you turned on scan reminders in Receipts.'
  const text = [
    `Your next weekly scan is due ${dueLabel}.`,
    '',
    `Scan now: ${scanUrl}`,
    '',
    why,
    `Stop these emails: ${unsubscribeUrl}`,
  ].join('\n')
  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#fcf8f4;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#2e2420">
<div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:20px;padding:28px">
<p style="margin:0 0 4px;font-size:14px;color:#7a6a62">Receipts</p>
<h1 style="margin:0 0 12px;font-size:24px;line-height:1.2">Time for your weekly scan</h1>
<p style="margin:0 0 20px;font-size:16px;line-height:1.5">Your next scan is due <strong>${escapeHtml(dueLabel)}</strong>. Two quick photos keep your verdicts honest.</p>
<p style="margin:0 0 24px"><a href="${escapeHtml(scanUrl)}" style="display:inline-block;background:#2e2420;color:#fcf8f4;text-decoration:none;font-weight:600;padding:14px 24px;border-radius:999px">Scan now</a></p>
<p style="margin:0;font-size:12px;line-height:1.5;color:#7a6a62">${escapeHtml(why)}<br><a href="${escapeHtml(unsubscribeUrl)}" style="color:#7a6a62">Unsubscribe</a></p>
</div></body></html>`
  return { subject, html, text }
}

/** "Fri, Nov 6": the due date as the reader's own calendar sees it. */
export function formatDueLabel(dueAt: number, timeZone: string): string {
  return new Date(dueAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone })
}
