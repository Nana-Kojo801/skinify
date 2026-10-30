import { REMINDER_CONFIG } from '../reminders/reminder-config'

/** True for addresses we never email: no address, or a test domain (example.com and friends). */
export function isBlockedAddress(email: string | null | undefined): boolean {
  if (!email) return true
  const at = email.lastIndexOf('@')
  if (at < 1) return true
  const domain = email.slice(at + 1).toLowerCase()
  return REMINDER_CONFIG.testDomains.some((blocked) => domain === blocked || domain.endsWith(`.${blocked}`))
}

/**
 * EMAIL_ALLOWED_TO decides who really gets email: unset or empty means nobody (safe default), `*` means everyone
 * (use once a sending domain is verified), otherwise a comma-separated list of addresses. During the hackathon
 * it holds only Nana's address (Resend's test sender can only reach the account owner).
 */
export function isAllowedRecipient(email: string, allowList: string | undefined): boolean {
  const entries = (allowList ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
  return entries.includes('*') || entries.includes(email.toLowerCase())
}
