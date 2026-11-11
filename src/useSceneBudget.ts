import { useEffect, useId, useSyncExternalStore } from 'react'
import type { RefObject } from 'react'

// Render one visible WebGL scene continuously. Other visible scenes retain a
// real, rendered 3D frame and resume as they become central or receive a hover.
const candidates = new Map<string, HTMLElement>()
const subscribers = new Set<() => void>()
let owner: string | null = null, hovered: string | null = null, frame = 0
function choose() {
  frame = 0
  let next: string | null = null, best = Infinity
  if (!document.hidden) for (const [id, element] of candidates) {
    const r = element.getBoundingClientRect()
    if (r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) continue
    const score = element.contains(document.activeElement) ? -2 : id === hovered ? -1 : Math.abs((r.top + r.bottom) / 2 - innerHeight / 2) / innerHeight
    if (score < best) { best = score; next = id }
  }
  if (owner !== next) { owner = next; subscribers.forEach(notify => notify()) }
}
function schedule() { if (!frame) frame = requestAnimationFrame(choose) }
const subscribe = (notify: () => void) => { subscribers.add(notify); return () => subscribers.delete(notify) }
export function useSceneBusy() {
  return useSyncExternalStore(subscribe, () => owner !== null, () => false)
}
export default function useSceneBudget(host: RefObject<HTMLElement | null>, enabled = true) {
  const id = useId()
  const current = useSyncExternalStore(subscribe, () => owner, () => null)
  useEffect(() => {
    const element = host.current
    if (!element || !enabled) return
    if (!candidates.size) {
      window.addEventListener('scroll', schedule, { passive: true })
      window.addEventListener('resize', schedule, { passive: true })
      document.addEventListener('visibilitychange', schedule)
    }
    candidates.set(id, element)
    const enter = (e: PointerEvent) => { if (e.pointerType !== 'touch') { hovered = id; choose() } }
    const leave = () => { if (hovered === id) { hovered = null; choose() } }
    element.addEventListener('pointerenter', enter); element.addEventListener('pointerleave', leave)
    element.addEventListener('focusin', schedule);element.addEventListener('focusout', schedule)
    choose()
    return () => {
      candidates.delete(id); if (hovered === id) hovered = null
      element.removeEventListener('pointerenter', enter); element.removeEventListener('pointerleave', leave)
      element.removeEventListener('focusin', schedule);element.removeEventListener('focusout', schedule)
      if (!candidates.size) {
        window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule)
        document.removeEventListener('visibilitychange', schedule); cancelAnimationFrame(frame); frame = 0
      }
      choose()
    }
  }, [host, id, enabled])
  return current === id
}
