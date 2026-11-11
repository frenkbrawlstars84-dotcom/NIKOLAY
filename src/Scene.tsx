import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Canvas } from '@react-three/fiber'
import SceneFallback from './SceneFallback'
import AdaptiveQuality from './AdaptiveQuality'
import CanvasHealth from './CanvasHealth'
import OrbitalNexus from './OrbitalNexus'
import type { ArtFrame } from './sceneTypes'
import useSceneBudget from './useSceneBudget'
import type { ObjectInteraction } from './objectInteraction'
import { getWebGLProfile } from './webglProfile'

type SceneProps = { interaction:ObjectInteraction; progress:RefObject<number>; reduced: boolean; paused: boolean; anchor: RefObject<HTMLDivElement | null>; onReady: () => void; onUnavailable: () => void }
export default function Scene({ interaction, progress, reduced, paused, anchor, onReady, onUnavailable }: SceneProps) {
  const [profile]=useState(getWebGLProfile),supported=profile.supported
  useEffect(() => { if (!supported) onUnavailable() }, [supported, onUnavailable])
  const [visible, setVisible] = useState(!document.hidden)
  const host = useRef<HTMLDivElement>(null)
  const ownsFrame = useSceneBudget(anchor, supported)
  const frame = useRef<ArtFrame>({ x: .25, y: 0, width: .5, height: .65 })
  const [inView, setInView] = useState(true)
  const software = useRef(profile.software)
  const [low, setLow] = useState(() => profile.software || matchMedia('(max-width: 900px)').matches || navigator.hardwareConcurrency <= 4)
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
    const resize = () => { setLow(software.current || media.matches || navigator.hardwareConcurrency <= 4); measure() }
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
    aria-label="Орбитальная цифровая скульптура NIKOLAY"
    camera={{ position: [0, 0, 7.4], fov: 42, near: .1, far: 70 }} dpr={low ? 1 : [1, 1.25]} frameloop={reduced || paused || !visible || !inView || !ownsFrame ? 'demand' : 'always'}
    onCreated={({gl})=>{const c=gl.getContext(),d=c.getExtension('WEBGL_debug_renderer_info');software.current=/swiftshader|llvmpipe/i.test(String(c.getParameter(d?d.UNMASKED_RENDERER_WEBGL:c.RENDERER)));if(software.current)setLow(true)}} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
  ><AdaptiveQuality low={low} active={!reduced&&!paused&&visible&&inView&&ownsFrame}><CanvasHealth onReady={onReady} onUnavailable={onUnavailable}/><OrbitalNexus interaction={interaction} progress={progress} reduced={reduced} paused={paused || !visible || !inView || !ownsFrame} low={low} frame={frame} /></AdaptiveQuality></Canvas> : <SceneFallback />}</div>
}
