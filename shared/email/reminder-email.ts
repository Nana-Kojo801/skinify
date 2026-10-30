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
  // Table layout and inline styles only: that is what email clients render reliably. Brand colours of the app (Blush).
  const html = `<!doctype html>
<html><body style="margin:0;padding:24px 12px;background:#f4efef;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#23181d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden">
<tr><td style="background:#f5c5cf;padding:16px 24px;font-size:18px;font-weight:800;letter-spacing:-0.02em">
<span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border-radius:8px;background:#23181d;color:#f5c5cf;font-size:15px;vertical-align:-6px;margin-right:8px">&#10003;</span>Receipts</td></tr>
<tr><td style="padding:26px 24px 8px">
<h1 style="margin:0 0 12px;font-size:28px;line-height:1.1;font-weight:800;letter-spacing:-0.025em">Time for your weekly scan</h1>
<p style="margin:0 0 22px;font-size:16px;line-height:1.5;color:#5e5257">Your next scan is due <strong style="color:#23181d">${escapeHtml(dueLabel)}</strong>. Two quick photos keep your verdicts honest.</p>
<p style="margin:0 0 26px"><a href="${escapeHtml(scanUrl)}" style="display:inline-block;background:#23181d;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:15px 28px;border-radius:999px">Scan now</a></p>
</td></tr>
<tr><td style="padding:16px 24px 20px;border-top:1px solid #eee7e8;font-size:12px;line-height:1.5;color:#74686d">${escapeHtml(why)}<br><a href="${escapeHtml(unsubscribeUrl)}" style="color:#5e5257">Unsubscribe</a></td></tr>
</table></body></html>`
  return { subject, html, text }
}

/** "Fri, Nov 6": the due date as the reader's own calendar sees it. */
export function formatDueLabel(dueAt: number, timeZone: string): string {
  return new Date(dueAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone })
}
