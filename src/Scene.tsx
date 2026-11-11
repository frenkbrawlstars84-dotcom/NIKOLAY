import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Canvas } from '@react-three/fiber'
import SceneFallback from './SceneFallback'
import AdaptiveQuality from './AdaptiveQuality'
import CanvasHealth from './CanvasHealth'
import HeroPortal from './HeroPortal'
import type { PortalFrame } from './HeroPortal'
import useSceneBudget from './useSceneBudget'

type SceneProps = { progress:RefObject<number>; reduced: boolean; paused: boolean; anchor: RefObject<HTMLDivElement | null>; onReady: () => void; onUnavailable: () => void }
export default function Scene({ progress, reduced, paused, anchor, onReady, onUnavailable }: SceneProps) {
  const [supported] = useState(() => {
    try {
      const gl = document.createElement('canvas').getContext('webgl2')
      if (!gl) return false
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      return true
    } catch { return false }
  })
  useEffect(() => { if (!supported) onUnavailable() }, [supported, onUnavailable])
  const [visible, setVisible] = useState(!document.hidden)
  const host = useRef<HTMLDivElement>(null)
  const ownsFrame = useSceneBudget(host, supported)
  const frame = useRef<PortalFrame>({ x: .25, y: 0, width: .5, height: .65 })
  const [inView, setInView] = useState(true)
  const [low, setLow] = useState(() => matchMedia('(max-width: 900px)').matches || navigator.hardwareConcurrency <= 4)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting))
    if (host.current) observer.observe(host.current)
    const measure = () => {
      if (!host.current || !anchor.current) return
      const full = host.current.getBoundingClientRect(), area = anchor.current.getBoundingClientRect()
      frame.current = { x: (area.left + area.width / 2 - full.left) / full.width - .5, y: .5 - (area.top + area.height / 2 - full.top) / full.height, width: area.width / full.width, height: area.height / full.height }
    }
    const resizeObserver = new ResizeObserver(measure)
    if (host.current) resizeObserver.observe(host.current)
    if (anchor.current) resizeObserver.observe(anchor.current)
    const media = matchMedia('(max-width: 900px)')
    const resize = () => { setLow(media.matches || navigator.hardwareConcurrency <= 4); measure() }
    const visibility = () => setVisible(!document.hidden)
    media.addEventListener('change', resize)
    document.addEventListener('visibilitychange', visibility)
    measure()
    return () => {
      observer.disconnect(); resizeObserver.disconnect()
      media.removeEventListener('change', resize)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [anchor])
  return <div ref={host} className="scene-host" data-scene-running={ownsFrame && !reduced && !paused && visible && inView}>{supported ? <Canvas
    aria-label="Объёмный энергетический портал с движущимися серебристыми потоками"
    camera={{ position: [0, 0, 7.4], fov: 42, near: .1, far: 70 }} dpr={low ? 1 : [1, 1.25]} frameloop={reduced || paused || !visible || !inView || !ownsFrame ? 'demand' : 'always'}
    gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
  ><AdaptiveQuality low={low} active={!reduced&&!paused&&visible&&inView&&ownsFrame}><CanvasHealth onReady={onReady} onUnavailable={onUnavailable}/><HeroPortal progress={progress} reduced={reduced} paused={paused || !visible || !inView || !ownsFrame} low={low} frame={frame} anchor={anchor} /></AdaptiveQuality></Canvas> : <SceneFallback />}</div>
}
