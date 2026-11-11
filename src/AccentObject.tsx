import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import useSceneBudget from './useSceneBudget'
import InteractiveSurface from './InteractiveSurface'
import { ObjectInteraction } from './objectInteraction'
const AccentScene = lazy(() => import('./AccentScene'))
export type AccentKind = 'signal' | 'glass' | 'cube'

function AccentFallback({ kind }: { kind: AccentKind }) {
  const project = (x: number, y: number, z: number) => `${100 + (x - z) * 19},${105 + (x + z) * 9 - y * 22}`
  return <div className="accent-fallback" aria-label={kind === 'cube' ? 'Статичная версия кубика Рубика' : 'Статичная версия хромированной скульптуры'}><svg viewBox="0 0 200 200" fill="none">
    {kind === 'cube' ? [0, 1, 2].flatMap(face => Array.from({ length: 9 }, (_, i) => {
      const a = i % 3 - 1.5 + .05, b = Math.floor(i / 3) - 1.5 + .05, d = .9
      const points = face === 0 ? [[a, 1.5, b], [a + d, 1.5, b], [a + d, 1.5, b + d], [a, 1.5, b + d]] : face === 1 ? [[1.5, a, b], [1.5, a + d, b], [1.5, a + d, b + d], [1.5, a, b + d]] : [[a, b, 1.5], [a + d, b, 1.5], [a + d, b + d, 1.5], [a, b + d, 1.5]]
      return <polygon key={`${face}-${i}`} points={points.map(p => project(p[0], p[1], p[2])).join(' ')} fill={['#fafafa', '#e5e5e5', '#f2f2f2'][face]} stroke="#111111" strokeWidth="1.5" strokeLinejoin="round"/>
    })) : kind === 'glass' ? <g stroke="#d8d8d8" strokeOpacity=".5"><path d="M100 25 150 67 154 127 100 173 46 127 50 67Z" fill="#ffffff08"/><path d="M100 25 80 78 124 119 100 173M50 67 124 119 154 127M150 67 80 78 46 127"/></g> : Array.from({ length: 16 }, (_, i) => <ellipse key={i} cx="100" cy="100" rx={56} ry={21 + i * .5} stroke="#cccccc" strokeOpacity=".6" strokeWidth=".7" transform={`rotate(${i * 12} 100 100)`}/>)}
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
  const [interaction] = useState(() => new ObjectInteraction())
  const ownsFrame = useSceneBudget(host, status !== 'fallback')
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
  useEffect(() => {
    if (!seen || status !== 'loading' || !inView || !visible) return
    const timeout = setTimeout(fail, 10_000)
    return () => clearTimeout(timeout)
  }, [seen, status, inView, visible, fail])
  const fallback = <AccentFallback kind={kind}/>
  const active = ownsFrame && inView && visible && !paused && !reduced
  return <motion.figure ref={host} className={`accent-object accent-${kind}`} data-accent-status={status} data-scene-running={active} initial={reduced?false:{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.15}} transition={{duration:.8,ease:[.22,1,.36,1]}}>
    <InteractiveSurface interaction={interaction} reduced={reduced} disabled={status!=='ready'||paused} className="accent-stage" label={kind==='cube'?'Кубик Рубика: перемешать и собрать':kind==='glass'?'Разобрать и собрать стеклянный многогранник':'Расплести хромированный узел'} hint={kind==='cube'?'Нажмите: перемешать и собрать':'Нажмите, чтобы изменить форму'}>{!seen || status === 'fallback' ? fallback : <AccentBoundary fail={fail} fallback={fallback}><Suspense fallback={fallback}><AccentScene interaction={interaction} kind={kind} reduced={reduced} paused={!active} low={low} onReady={ready} onUnavailable={fail}/></Suspense></AccentBoundary>}</InteractiveSurface>
    <figcaption>{kind === 'cube' ? 'СЛОЖНОЕ — ИЗ ПРОСТЫХ ЧАСТЕЙ' : kind === 'glass' ? 'СТЕКЛО / ПРЕЛОМЛЕНИЕ / СВЕТ' : 'НАЖМИТЕ / ПОТЯНИТЕ / ИССЛЕДУЙТЕ'}</figcaption>
  </motion.figure>
}
