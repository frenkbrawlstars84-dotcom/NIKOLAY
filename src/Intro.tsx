import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { INTRO_DURATION, INTRO_SESSION_KEY, introFrame } from './introTimeline'
import useReducedMotion from './useReducedMotion'
import { ArrowUpRight } from 'lucide-react'

const IntroScene = lazy(() => import('./IntroScene'))
const preview = () => new URLSearchParams(location.search).get('previewIntro') === '1'
export function shouldPlayIntro() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  if (preview()) return true
  try { return sessionStorage.getItem(INTRO_SESSION_KEY) !== '1' } catch { return true }
}

class IntroBoundary extends Component<{ children: ReactNode; fail: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.fail() }
  render() { return this.state.failed ? null : this.props.children }
}

export default function Intro({ onComplete }: { onComplete: () => void }) {
  const reduced = useReducedMotion()
  const host = useRef<HTMLDivElement>(null)
  const started = useRef(performance.now())
  const elapsed = useRef(0)
  const done = useRef(false)
  const readyRef = useRef(false)
  const [ready, setReady] = useState(false)
  const finish = useCallback(() => {
    if (done.current) return
    done.current = true
    // Preview must neither clear nor set the normal session flag.
    if (!preview()) try { sessionStorage.setItem(INTRO_SESSION_KEY, '1') } catch { /* storage may be disabled */ }
    onComplete()
  }, [onComplete])
  const onReady = useCallback(() => { readyRef.current = true; setReady(true) }, [])
  useEffect(() => { if (reduced) finish() }, [reduced, finish])
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    let frame = 0
    const update = () => {
      elapsed.current = (performance.now() - started.current) / 1000
      const state = introFrame(elapsed.current)
      if (host.current) {
        host.current.style.opacity = String(state.opacity)
        host.current.dataset.introPhase = state.phase
      }
      if (elapsed.current >= INTRO_DURATION) finish()
      else frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update)
    // Imports, a background tab or a GPU that never draws cannot trap users.
    const loadingTimeout = setTimeout(() => { if (!readyRef.current) finish() }, 1800)
    const deadline = setTimeout(finish, INTRO_DURATION * 1000)
    return () => {
      cancelAnimationFrame(frame); clearTimeout(loadingTimeout); clearTimeout(deadline)
      document.body.style.overflow = previousOverflow
    }
  }, [finish])
  return <div ref={host} className={`cosmic-intro ${ready ? 'intro-ready' : ''}`} data-intro-phase="black-hole" role="dialog" aria-modal="true" aria-label="Космическое вступление">
    <div className="intro-static" aria-hidden="true"><svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
      <defs><radialGradient id="intro-disk"><stop offset="0" stopColor="#edf1fb"/><stop offset=".5" stopColor="#91a7ce"/><stop offset="1" stopColor="#566889" stopOpacity="0"/></radialGradient></defs>
      <ellipse cx="500" cy="300" rx="245" ry="75" fill="url(#intro-disk)"/><circle cx="500" cy="300" r="72" fill="#050609"/>
      <path d="M423 300a77 77 0 0 1 154 0" fill="none" stroke="#e0e7f3" strokeWidth="3"/>
    </svg></div>
    <IntroBoundary fail={finish}><Suspense fallback={null}><IntroScene elapsed={elapsed} onReady={onReady} onUnavailable={finish}/></Suspense></IntroBoundary>
    <div className="intro-label" aria-hidden="true">NIKOLAY <span>DIGITAL EXPERIENCE</span></div>
    <button className="intro-skip" onClick={finish} autoFocus>Пропустить <ArrowUpRight size={15} aria-hidden="true"/></button>
  </div>
}
