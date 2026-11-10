import { useSyncExternalStore } from 'react'

// Keep custom WebGL/GSAP animations in sync when the OS setting changes while
// the page is open; Motion's installed hook only samples its initial value.
const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
const subscribe = (notify: () => void) => {
  preference.addEventListener('change', notify)
  return () => preference.removeEventListener('change', notify)
}
const snapshot = () => preference.matches
export default function useReducedMotion() {
  return useSyncExternalStore(subscribe, snapshot, () => true)
}
