// Public Telegram, confirmed by Nikolay. Can be overridden at build time.
const configured = import.meta.env.VITE_TELEGRAM_URL?.trim()
const telegramUrl = configured && /^https:\/\/t\.me\/[a-zA-Z0-9_]+\/?$/.test(configured) ? configured : 'https://t.me/yuniorqq'
export const contacts = {
  telegramUrl,
  telegramLabel: '@' + telegramUrl.replace(/^https:\/\/t\.me\//, '').replace(/\/$/, ''),
}
