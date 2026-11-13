export const INTRO_DURATION = 5.8
export const INTRO_SESSION_KEY = 'nikolay:intro-seen'

function smooth(start: number, end: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)))
  return t * t * (3 - 2 * t)
}

// Wall-clock seconds, independent of scroll and GPU frame rate. The flight
// overlaps the disk before its centre fills the screen, avoiding a black cut.
export function introFrame(seconds: number) {
  const t = Math.max(0, seconds)
  return {
    eye: 22 - 17 * smooth(0, 2.6, t),
    hole: 1 - smooth(1.65, 2.55, t),
    flight: smooth(1.55, 2.35, t),
    travel: Math.max(0, t - 1.55) * 13,
    opacity: 1 - smooth(4.7, INTRO_DURATION, t),
    phase: t < 1.8 ? 'black-hole' : t < 4.7 ? 'flight' : 'reveal',
  }
}
