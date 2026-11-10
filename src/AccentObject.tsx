import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
const AccentScene = lazy(() => import('./AccentScene'))
export type AccentKind = 'signal' | 'cube'

function AccentFallback({ kind }: { kind: AccentKind }) {
  const project = (x: number, y: number, z: number) => `${100 + (x - z) * 19},${105 + (x + z) * 9 - y * 22}`
  return <div className="accent-fallback" aria-label={kind === 'cube' ? 'Статичная версия кубика Рубика' : 'Статичная версия хромированной скульптуры'}><svg viewBox="0 0 200 200" fill="none">
    {kind === 'cube' ? [0, 1, 2].flatMap(face => Array.from({ length: 9 }, (_, i) => {
      const a = i % 3 - 1.5 + .05, b = Math.floor(i / 3) - 1.5 + .05, d = .9
      const points = face === 0 ? [[a, 1.5, b], [a + d, 1.5, b], [a + d, 1.5, b + d], [a, 1.5, b + d]] : face === 1 ? [[1.5, a, b], [1.5, a + d, b], [1.5, a + d, b + d], [1.5, a, b + d]] : [[a, b, 1.5], [a + d, b, 1.5], [a + d, b + d, 1.5], [a, b + d, 1.5]]
      return <polygon key={`${face}-${i}`} points={points.map(p => project(p[0], p[1], p[2])).join(' ')} fill={['#fafafa', '#e5e5e5', '#f2f2f2'][face]} stroke="#111111" strokeWidth="1.5" strokeLinejoin="round"/>
    })) : Array.from({ length: 16 }, (_, i) => <ellipse key={i} cx="100" cy="100" rx={56} ry={21 + i * .5} stroke="#acbdd4" strokeOpacity=".6" strokeWidth=".7" transform={`rotate(${i * 12} 100 100)`}/>)}
  </svg></div>
}
class AccentBoundary extends Component<{ children: ReactNode; fallback: ReactNode; fail: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.fail() }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}
export default function AccentObject({ kind, reduced, paused }: { kind: AccentKind; reduced: boolean; paused: boolean }) {
  const host = useRef<HTMLElement>(null)
  const [seen, setSeen] = useState(false), [inView, setInView] = useState(false), [visible, setVisible] = useState(!document.hidden)
  const [low, setLow] = useState(() => innerWidth <= 900 || navigator.hardwareConcurrency <= 4)
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading')
  const phase = useRef(status)
  const fail = useCallback(() => { phase.current = 'fallback'; setStatus('fallback') }, [])
  const ready = useCallback(() => { if (phase.current === 'loading') { phase.current = 'ready'; setStatus('ready') } }, [])
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { setInView(entry.isIntersecting); if (entry.isIntersecting) setSeen(true) }, { rootMargin: '80px' })
    if (host.current) observer.observe(host.current)
    const media = matchMedia('(max-width: 900px)')
    const resize = () => setLow(media.matches || navigator.hardwareConcurrency <= 4)
    const visibility = () => setVisible(!document.hidden)
    media.addEventListener('change', resize); document.addEventListener('visibilitychange', visibility)
    return () => { observer.disconnect(); media.removeEventListener('change', resize); document.removeEventListener('visibilitychange', visibility) }
  }, [])
  const simplified = kind === 'signal' && low
  useEffect(() => {
    if (!seen || status !== 'loading' || simplified || !inView || !visible) return
    const timeout = setTimeout(fail, 10_000)
    return () => clearTimeout(timeout)
  }, [seen, status, simplified, inView, visible, fail])
  const fallback = <AccentFallback kind={kind}/>
  return <figure ref={host} className={`accent-object accent-${kind}`} data-accent-status={simplified ? 'simplified' : status}>
    <div className="accent-stage">{!seen || simplified || status === 'fallback' ? fallback : <AccentBoundary fail={fail} fallback={fallback}><Suspense fallback={fallback}><AccentScene kind={kind} reduced={reduced} paused={paused || !inView || !visible} low={low} onReady={ready} onUnavailable={fail}/></Suspense></AccentBoundary>}</div>
    <figcaption>{kind === 'cube' ? 'СЛОЖНОЕ — ИЗ ПРОСТЫХ ЧАСТЕЙ' : 'ФОРМА / МАТЕРИАЛ / ДВИЖЕНИЕ'}</figcaption>
  </figure>
}
