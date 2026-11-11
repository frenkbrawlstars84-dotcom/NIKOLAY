import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Asterisk } from 'lucide-react'
import type { ReactNode } from 'react'
import './intro.css'
const PortalScene = lazy(() => import('./PortalScene'))
const sessionKey = 'nikolay-portal-seen-v1'
export function shouldPlayIntro() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || location.hash) return false
  try { return sessionStorage.getItem(sessionKey) !== '1' } catch { return true }
}
class PortalBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure() }
  render() { return this.state.failed ? null : this.props.children }
}
export default function CosmicIntro({ onComplete, onReveal }: { onComplete: () => void; onReveal: () => void }) {
  const [ready, setReady] = useState(false), [leaving, setLeaving] = useState(false)
  const finished = useRef(false), skip = useRef<HTMLButtonElement>(null)
  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    try { sessionStorage.setItem(sessionKey, '1') } catch { /* Storage may be disabled. */ }
    onReveal()
    setLeaving(true)
  }, [onReveal])
  const sceneReady = useCallback(() => setReady(true), [])
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timeout = window.setTimeout(finish, 4550)
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') finish() }
    window.addEventListener('keydown', escape)
    return () => { document.body.style.overflow = previous; clearTimeout(timeout); window.removeEventListener('keydown', escape) }
  }, [finish])
  useEffect(() => {
    if (!ready) return
    const timeout = window.setTimeout(finish, 3550)
    return () => clearTimeout(timeout)
  }, [ready, finish])
  useEffect(() => {
    if (!leaving) return
    const timeout = window.setTimeout(() => {
      const restoreFocus = document.activeElement === skip.current
      onComplete()
      if (restoreFocus) requestAnimationFrame(() => document.querySelector<HTMLAnchorElement>('.brand')?.focus())
    }, 450)
    return () => clearTimeout(timeout)
  }, [leaving, onComplete])
  return <section className={`cosmic-intro ${ready?'is-ready':''} ${leaving?'is-leaving':''}`} aria-label="Космическое вступление" data-intro-state={leaving?'leaving':ready?'playing':'loading'}>
    <div className="portal-placeholder" aria-hidden="true"><div/></div>
    <div className="portal-canvas" aria-hidden="true"><PortalBoundary onFailure={finish}><Suspense fallback={null}><PortalScene onReady={sceneReady} onUnavailable={finish}/></Suspense></PortalBoundary></div>
    <div className="portal-vignette" aria-hidden="true"/>
    <div className="portal-top"><span>NIKOLAY <i><Asterisk size={18}/></i></span><span>ПУТЕШЕСТВИЕ НАЧИНАЕТСЯ</span></div>
    <div className="portal-caption"><span>ПО ДРУГУЮ СТОРОНУ ПРИВЫЧНОГО</span><p>У каждой идеи —<br/><em>своя вселенная.</em></p></div>
    <div className="portal-bottom"><span>01 / ВХОД В ЦИФРОВОЕ ПРОСТРАНСТВО</span><button ref={skip} onClick={finish}>Пропустить интро <ArrowUpRight size={15} aria-hidden="true"/></button></div>
  </section>
}
