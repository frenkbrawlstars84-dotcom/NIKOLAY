import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import './intro.css'

const SESSION_KEY = 'nikolay:intro-seen'
const isPreview = () => new URLSearchParams(window.location.search).get('previewIntro') === '1'

export function shouldPlayIntro() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  if (isPreview()) return true
  try { return window.sessionStorage.getItem(SESSION_KEY) !== '1' } catch { return true }
}

/** A deliberately lightweight, resolution-independent intro: no GPU scene to load. */
export default function Intro({ onComplete, onPrepare }: { onComplete: () => void; onPrepare: () => void }) {
  const [leaving, setLeaving] = useState(false)
  const finished = useRef(false)
  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    if (!isPreview()) {
      try { window.sessionStorage.setItem(SESSION_KEY, '1') } catch { /* blocked storage */ }
    }
    onComplete()
  }, [onComplete])

  useEffect(() => {
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Prepare the portfolio while the introduction is visible, not after it.
    onPrepare()
    const transition = window.setTimeout(() => setLeaving(true), 1900)
    const complete = window.setTimeout(finish, 2600)
    return () => {
      clearTimeout(transition)
      clearTimeout(complete)
      document.body.style.overflow = oldOverflow
    }
  }, [onPrepare, finish])

  const strands = useMemo(() => Array.from({ length: 96 }, (_, index) => {
    let path = ''
    const base = index / 96 * Math.PI * 2
    for (let step = 0; step <= 50; step++) {
      const t = step / 50
      const radius = 24 + 535 * Math.pow(t, .87)
      const angle = base + 2.65 * Math.pow(1 - t, 1.28)
      const x = 500 + Math.cos(angle) * radius
      const y = 500 + Math.sin(angle) * radius
      path += (step ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2) + ' '
    }
    return path
  }), [])

  return <div className={'cosmic-intro' + (leaving ? ' is-leaving' : '')} role="dialog" aria-modal="true" aria-label="Короткое космическое вступление">
    <div className="intro-grain" aria-hidden="true" />
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
    <div className="intro-progress" aria-hidden="true"><i /></div>
    <button type="button" className="intro-skip" onClick={finish}>Пропустить <ArrowUpRight size={16} aria-hidden="true" /></button>
  </div>
}
