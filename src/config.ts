// Public contact details. Vite environment variables can override these on deploy.
const telegramUrl = import.meta.env.VITE_TELEGRAM_URL?.trim() || 'https://t.me/yuniorqq'
const telegramPath = /^https:\/\/t\.me\/([a-zA-Z0-9_+]+)\/?$/.exec(telegramUrl)?.[1]
const email = import.meta.env.VITE_EMAIL?.trim()

export const contacts = {
  telegramUrl: telegramPath ? telegramUrl : undefined,
  telegramLabel: telegramPath ? (telegramPath.startsWith('+') ? `t.me/${telegramPath}` : `@${telegramPath}`) : undefined,
  email: email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined,
}
