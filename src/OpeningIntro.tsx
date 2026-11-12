import { Component, lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import useReducedMotion from './useReducedMotion'
import { introFrame } from './introState'
import type { IntroPhase } from './introState'
import './intro.css'
const IntroCanvas = lazy(() => import('./IntroCanvas'))

class IntroBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure() }
  render() { return this.state.failed ? null : this.props.children }
}
function IntroPlaceholder() {
  return <div className="intro-placeholder" aria-hidden="true">
    <div className="intro-starfield"/>
    <svg className="intro-static-hole" viewBox="0 0 1200 800" fill="none">
      <defs><radialGradient id="intro-disk"><stop stopColor="#e4e9f4"/><stop offset=".5" stopColor="#92a7c7"/><stop offset="1" stopColor="#34435d" stopOpacity="0"/></radialGradient></defs>
      <g transform="translate(600 400) rotate(-9)">
        {Array.from({length:24},(_,i)=><ellipse key={i} rx={180+i*11} ry={45+i*3.7} stroke="url(#intro-disk)" strokeWidth={i%3===0?3:1.2} opacity={.3+i/45}/>)}
        <circle r="116" fill="#010204"/><path d="M-155 0a155 155 0 0 1 310 0" stroke="#b2c6e6" strokeWidth="6" opacity=".55"/>
      </g>
    </svg>
    <div className="intro-fallback-galaxy"/>
  </div>
}
export default function OpeningIntro({ onComplete }: { onComplete: () => void }) {
  const reduced = !!useReducedMotion()
  const host = useRef<HTMLElement>(null), progress = useRef(0), elapsed = useRef(0)
  const start = useRef<number | null>(null), finished = useRef(false)
  const [renderer, setRenderer] = useState<'loading'|'ready'|'fallback'>('loading')
  const [phase, setPhase] = useState<IntroPhase>('black-hole')
  const phaseRef = useRef<IntroPhase>('black-hole')
  const completeRef = useRef(onComplete); completeRef.current = onComplete
  const finish = useCallback(() => { if (!finished.current) { finished.current = true; completeRef.current() } }, [])
  const ready = useCallback(() => { if (start.current === null) start.current = performance.now(); setRenderer(v => v === 'loading' ? 'ready' : v) }, [])
  const unavailable = useCallback(() => { if (start.current === null) start.current = performance.now(); setRenderer('fallback') }, [])
  useLayoutEffect(() => {
    const bodyOverflow = document.body.style.overflow, htmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'; document.documentElement.style.overflow = 'hidden'
    return () => { document.body.style.overflow = bodyOverflow; document.documentElement.style.overflow = htmlOverflow }
  }, [])
  useEffect(() => {
    // A blocked lazy import or failed GPU still gives a visible, finite intro.
    const timeout = setTimeout(()=>{if(start.current===null)unavailable()}, 3000)
    if (renderer !== 'loading') clearTimeout(timeout)
    return () => clearTimeout(timeout)
  }, [renderer, unavailable])
  useEffect(() => {
    let frame = 0, last = performance.now()
    const tick = (now: number) => {
      if (start.current !== null && !document.hidden) elapsed.current += Math.max(0, now - Math.max(last, start.current)) / 1000
      last = now
      const state = introFrame(elapsed.current, reduced)
      progress.current = state.progress
      if (host.current) { host.current.style.setProperty('--intro-progress', String(state.progress)); host.current.style.setProperty('--intro-fade', String(state.fade)) }
      if (state.phase !== phaseRef.current) { phaseRef.current = state.phase; setPhase(state.phase) }
      if (state.done) { finish(); return }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') finish() }
    const visibility=()=>{last=performance.now()}
    document.addEventListener('visibilitychange',visibility)
    window.addEventListener('keydown', key)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('keydown', key); document.removeEventListener('visibilitychange',visibility) }
  }, [finish, reduced])
  return <section ref={host} className="opening-intro" data-intro-phase={phase} data-intro-renderer={renderer} role="dialog" aria-modal="true" aria-label="Вступление NIKOLAY: чёрная дыра и полёт через галактики">
    <div className="intro-art"><IntroPlaceholder/>{renderer !== 'fallback' && <IntroBoundary onFailure={unavailable}><Suspense fallback={null}><IntroCanvas progress={progress} elapsed={elapsed} phase={phase} reduced={reduced} onReady={ready} onUnavailable={unavailable}/></Suspense></IntroBoundary>}</div>
    <div className="intro-top"><span>NIKOLAY <small>DIGITAL EXPERIENCE</small></span><button type="button" className="intro-skip" autoFocus onClick={finish}>Пропустить <span aria-hidden="true">↗</span></button></div>
    <div className="intro-caption" role="status" aria-live="polite"><span>{phase === 'black-hole' ? 'TON 618' : phase === 'galaxies' ? 'СКВОЗЬ ГАЛАКТИКИ' : 'NIKOLAY'}</span><small>{phase === 'black-hole' ? 'ПУТЕШЕСТВИЕ НАЧИНАЕТСЯ' : phase === 'galaxies' ? 'ЗА ПРЕДЕЛАМИ ВИДИМОГО' : 'ЦИФРОВОЕ ПРОСТРАНСТВО'}</small></div>
    <div className="intro-progress" aria-hidden="true"><i/></div>
  </section>
}
