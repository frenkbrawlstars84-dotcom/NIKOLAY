import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import { ArrowUp, ArrowUpRight, MoveUp } from 'lucide-react'
import './intro.css'

const SESSION_KEY = 'nikolay:intro-seen'
const isPreview = () => new URLSearchParams(window.location.search).get('previewIntro') === '1'
const clamp = (value: number) => Math.min(1, Math.max(0, value))

export function shouldPlayIntro() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  if (isPreview()) return true
  try { return window.sessionStorage.getItem(SESSION_KEY) !== '1' } catch { return true }
}

/** A visitor-controlled, resolution-independent journey into the portfolio. */
export default function Intro({ onComplete, onPrepare }: { onComplete: () => void; onPrepare: () => void }) {
  const [progress, setProgress] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const progressRef = useRef(0)
  const finished = useRef(false)
  const entering = useRef(false)
  const releaseTimer = useRef<number | undefined>(undefined)
  const activePointer = useRef<{ id: number; y: number; starting: number } | null>(null)

  const changeProgress = useCallback((value: number) => {
    if (entering.current || finished.current) return
    progressRef.current = clamp(value)
    setProgress(progressRef.current)
  }, [])
  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    window.clearTimeout(releaseTimer.current)
    if (!isPreview()) {
      try { window.sessionStorage.setItem(SESSION_KEY, '1') } catch { /* storage disabled */ }
    }
    onComplete()
  }, [onComplete])
  const enter = useCallback(() => {
    if (finished.current || entering.current) return
    entering.current = true
    progressRef.current = 1
    setProgress(1)
    setLeaving(true)
    releaseTimer.current = window.setTimeout(finish, 620)
  }, [finish])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    onPrepare() // Load the hero before releasing the curtain.
    const onKey = (event: KeyboardEvent) => {
      if (['ArrowDown', 'PageDown', ' ', 'Enter'].includes(event.key) && !event.altKey && !event.ctrlKey && !event.metaKey) {
        // Buttons have native Enter/Space behavior; don't intercept them.
        if (document.activeElement instanceof HTMLButtonElement) return
        event.preventDefault()
        enter()
      }
      if (event.key === 'Escape') finish()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(releaseTimer.current)
      document.body.style.overflow = previousOverflow
    }
  }, [onPrepare, enter, finish])

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (entering.current || (event.target instanceof Element && event.target.closest('button'))) return
    if (event.button !== 0 && event.pointerType !== 'touch') return
    activePointer.current = { id: event.pointerId, y: event.clientY, starting: progressRef.current }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = activePointer.current
    if (!active || active.id !== event.pointerId) return
    const distance = Math.min(330, Math.max(180, window.innerHeight * .37))
    changeProgress(active.starting + (active.y - event.clientY) / distance)
  }
  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = activePointer.current
    if (!active || active.id !== event.pointerId) return
    activePointer.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (progressRef.current >= .66) enter()
    else changeProgress(0)
  }
  const onWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (entering.current) return
    // The journey responds to the user's actual scroll rather than autoplaying.
    const adjusted = clamp(event.deltaY / (event.deltaMode === 1 ? 55 : event.deltaMode === 2 ? 2.2 : 780))
    const next = clamp(progressRef.current + adjusted)
    if (next >= .92) enter()
    else changeProgress(next)
  }

  const strands = useMemo(() => Array.from({ length: 96 }, (_, index) => {
    let path = ''
    const base = index / 96 * Math.PI * 2
    for (let step = 0; step <= 50; step++) {
      const t = step / 50
      const radius = 24 + 535 * Math.pow(t, .87)
      const angle = base + 2.65 * Math.pow(1 - t, 1.28)
      path += (step ? 'L' : 'M') + (500 + Math.cos(angle) * radius).toFixed(2) + ' ' +
        (500 + Math.sin(angle) * radius).toFixed(2) + ' '
    }
    return path
  }), [])

  const introStyle = { '--pull': progress } as CSSProperties
  return <div className={'cosmic-intro interactive-intro' + (leaving ? ' is-leaving' : '')}
    style={introStyle} role="dialog" aria-modal="true" aria-label="Войти в цифровую вселенную NIKOLAY"
    onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd}
    onPointerCancel={onPointerEnd} onWheel={onWheel}>
    <div className="intro-grain" aria-hidden="true" />
    <div className="intro-depth" aria-hidden="true" />
    <div className="intro-vortex" aria-hidden="true">
      <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet" focusable="false">
        <g className="intro-strands">
          {strands.map((path, i) => <path key={i} d={path} stroke="white" strokeOpacity={.16 + .47 * Math.abs(Math.sin(i * 2.38))} strokeWidth={i % 11 === 0 ? 1.1 : .55} fill="none" />)}
        </g>
        <circle cx="500" cy="500" r="27" fill="#050609" />
        <circle cx="500" cy="500" r="28" fill="none" stroke="#f5f5f7" strokeWidth=".8" strokeOpacity=".8" />
      </svg>
    </div>
    <div className="intro-brand">NIKOLAY <span>DIGITAL EXPERIENCE</span></div>
    <div className="intro-message">
      <p>ОТ ИДЕИ ДО ВПЕЧАТЛЕНИЯ</p>
      <h2>За пределами<br/><em>обычного.</em></h2>
      <span>Веб-дизайн. Разработка. Интерактив.</span>
    </div>
    <div className="intro-guidance">
      <div className="intro-drag-symbol" aria-hidden="true"><MoveUp size={21}/></div>
      <div className="intro-guide-text"><strong>ПОТЯНИТЕ ВВЕРХ, ЧТОБЫ ВОЙТИ</strong><span>Проведите пальцем, потяните мышью или прокрутите вниз</span></div>
      <button className="intro-enter" type="button" onClick={enter}>Войти в портфолио <ArrowUpRight size={15} /></button>
    </div>
    <div className="intro-progress" role="progressbar" aria-label="Погружение в сайт"
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}><i/></div>
    <button type="button" className="intro-skip" onClick={finish}>Пропустить <ArrowUp size={15} aria-hidden="true" /></button>
  </div>
}
