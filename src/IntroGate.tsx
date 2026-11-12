import { useLayoutEffect, useState } from 'react'
import type { ReactNode } from 'react'
import OpeningIntro from './OpeningIntro'
import { markIntroSeen, shouldPlayIntro } from './introState'

function session() {
  try { return window.sessionStorage } catch { return null }
}
export default function IntroGate({ children }: { children: ReactNode }) {
  const [playing, setPlaying] = useState(() => shouldPlayIntro(location.search, session()))
  useLayoutEffect(() => {
    const previous = history.scrollRestoration
    history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    return () => { history.scrollRestoration = previous }
  }, [])
  const finish = () => {
    markIntroSeen(session())
    window.scrollTo(0, 0)
    setPlaying(false)
  }
  // The portfolio is not mounted behind the intro: no early hero flash,
  // duplicate WebGL scenes, accessible hidden links or background scrolling.
  return playing ? <OpeningIntro onComplete={finish}/> : <div className="portfolio-entry">{children}</div>
}
