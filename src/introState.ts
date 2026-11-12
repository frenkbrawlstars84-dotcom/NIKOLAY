import { cameraDistance } from './tonTravel.ts'

export const INTRO_SESSION_KEY = 'nikolay:intro:seen:v1'
export const INTRO_DURATION = 7.6
export type IntroPhase = 'black-hole' | 'galaxies' | 'reveal'

// Read only during initialization. StrictMode must never mark a session seen.
export function shouldPlayIntro(search: string, storage: Pick<Storage, 'getItem'> | null) {
  if (new URLSearchParams(search).get('previewIntro') === '1') return true
  try { return storage?.getItem(INTRO_SESSION_KEY) !== '1' } catch { return true }
}
export function markIntroSeen(storage: Pick<Storage, 'setItem'> | null) {
  try { storage?.setItem(INTRO_SESSION_KEY, '1') } catch { /* Storage restrictions must not trap the visitor. */ }
}
export function introFrame(elapsed: number, reduced = false) {
  const duration = reduced ? 2.4 : INTRO_DURATION
  const progress = Math.min(1, Math.max(0, elapsed / duration))
  // Start close to the disk, cross it during the first half, then decelerate
  // through the galaxies. This clock has no connection to scroll position.
  const travel = progress < .45 ? .42 + progress / .45 * .28 : .7 + (1 - (1 - (progress - .45) / .55) ** 2) * .3
  const distance = cameraDistance(travel)
  const phase: IntroPhase = progress >= .88 ? 'reveal' : distance <= 0 ? 'galaxies' : 'black-hole'
  return { progress, distance, phase, fade: Math.max(0, (progress - .88) / .12), done: progress === 1 }
}
