// The only place that knows which email provider we use (Resend). To switch provider, change this file.
// API: https://resend.com/docs/api-reference/emails/send-email  (POST /emails, Bearer key, Idempotency-Key header).
const RESEND_API = 'https://api.resend.com'

export type EmailMessage = { to: string; subject: string; html: string; text: string }
export type EmailSettings = {
  apiKey: string
  /** e.g. `Receipts <onboarding@resend.dev>` */
  from: string
  /** Same key within 24 hours = Resend sends only once, so a retry after a crash can't double-send. */
  idempotencyKey?: string
}

/** Sends one email and returns the provider's id for it. Throws with the HTTP status (never the API key). */
export async function sendEmail(message: EmailMessage, settings: EmailSettings): Promise<string> {
  const response = await fetch(`${RESEND_API}/emails`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json',
      ...(settings.idempotencyKey ? { 'Idempotency-Key': settings.idempotencyKey } : {}),
    },
    body: JSON.stringify({ from: settings.from, to: message.to, subject: message.subject, html: message.html, text: message.text }),
  })
  if (!response.ok) {
    const detail = await response
      .json()
      .then((body: { message?: string }) => body.message)
      .catch(() => undefined)
    throw new Error(`Email provider failed with status ${response.status}${detail ? ` (${detail})` : ''}`)
  }
  const body = (await response.json()) as { id: string }
  return body.id
}
