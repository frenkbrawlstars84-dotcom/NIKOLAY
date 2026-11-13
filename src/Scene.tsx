import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import SceneFallback from './SceneFallback'
import CanvasHealth from './CanvasHealth'
import useSceneBudget from './useSceneBudget'

type Props = { reduced: boolean; paused: boolean; onReady: () => void; onUnavailable: () => void }
const vertex = `
  uniform float uTime;
  uniform float uMorph;
  attribute float aStrand;
  varying float vLight;
  void main() {
    vec3 p = position;
    p.xy *= 1. + .04 * sin(p.z * 1.7 + uTime * .16);
    p.x += sin(p.y * 1.3 + uTime * .16) * .06;
    // A bounded shape change on click, never a corridor or camera flight.
    p.z *= 1. + uMorph * .7;
    p.xy *= 1. - uMorph * .1;
    vLight = .3 + .7 * pow(.5 + .5 * sin(aStrand * 28. + uTime * .16), 2.);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
  }
`
const fragment = `
  varying float vLight;
  void main() { gl_FragColor = vec4(vec3(.77, .83, .94) * vLight, .45 * (.35 + .65 * vLight)); }
`
function Sculpture({ reduced, paused, low, pointer, morphed }: Pick<Props, 'reduced' | 'paused'> & {
  low: boolean; pointer: React.RefObject<{x:number;y:number}>; morphed: boolean
}) {
  const object = useRef<THREE.Group>(null)
  const { invalidate } = useThree()
  const clock = useRef(0), fresh = useRef(true), pose = useRef({x:0,y:0})
  useEffect(() => { fresh.current = true; invalidate() }, [paused, reduced, morphed, invalidate])
  const geometry = useMemo(() => {
    const points: number[] = [], ids: number[] = []
    const strands = low ? 36 : 76, segments = low ? 104 : 168
    for (let j = 0; j < strands; j++) {
      const f = j / strands, a = f * Math.PI * 2
      for (let k = 0; k < segments; k++) for (const n of [k, k + 1]) {
        const t = n / segments * Math.PI * 2, radius = 1.55 + .46 * Math.cos(3 * t + a)
        points.push(radius * Math.cos(t), radius * Math.sin(t), .57 * Math.sin(3 * t + a) + .17 * Math.cos(a))
        ids.push(f)
      }
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    result.setAttribute('aStrand', new THREE.Float32BufferAttribute(ids, 1))
    return result
  }, [low])
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vertex, fragmentShader: fragment, transparent: true,
    depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uMorph: { value: 0 } },
  }), [])
  useEffect(() => () => { geometry.dispose() }, [geometry])
  useEffect(() => () => { material.dispose() }, [material])
  useFrame((_, delta) => {
    const dt = fresh.current ? 0 : Math.min(delta, .05)
    fresh.current = false
    if (!paused && !reduced) clock.current += dt
    const damping = reduced ? 1 : 1 - Math.exp(-dt * 5)
    pose.current.x += ((reduced ? 0 : pointer.current.x) - pose.current.x) * damping
    pose.current.y += ((reduced ? 0 : pointer.current.y) - pose.current.y) * damping
    material.uniforms.uTime.value = clock.current
    material.uniforms.uMorph.value += (Number(morphed) - material.uniforms.uMorph.value) * damping
    if (object.current) object.current.rotation.set(.3 + pose.current.y * .15, -.4 + clock.current * .09 + pose.current.x * .2, -.35)
  })
  return <group ref={object} rotation={[.3,-.4,-.35]}><lineSegments geometry={geometry} material={material} frustumCulled={false}/></group>
}
export default function Scene({ reduced, paused, onReady, onUnavailable }: Props) {
  const [supported] = useState(() => {
    try {
      const gl = document.createElement('canvas').getContext('webgl2')
      if (!gl) return false
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      return true
    } catch { return false }
  })
  useEffect(() => { if (!supported) onUnavailable() }, [supported, onUnavailable])
  const host = useRef<HTMLDivElement>(null), pointer = useRef({ x: 0, y: 0 })
  const [morphed, setMorphed] = useState(false)
  const [visible, setVisible] = useState(!document.hidden), [inView, setInView] = useState(true)
  const [low, setLow] = useState(() => innerWidth <= 900 || navigator.hardwareConcurrency <= 4)
  const ownsFrame = useSceneBudget(host, supported)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting))
    if (host.current) observer.observe(host.current)
    const media = matchMedia('(max-width: 900px)')
    const resize = () => setLow(media.matches || navigator.hardwareConcurrency <= 4)
    const visibility = () => setVisible(!document.hidden)
    media.addEventListener('change', resize); document.addEventListener('visibilitychange', visibility)
    return () => { observer.disconnect(); media.removeEventListener('change', resize); document.removeEventListener('visibilitychange', visibility) }
  }, [])
  const running = ownsFrame && !reduced && !paused && visible && inView
  return <div ref={host} className="scene-host" data-scene-running={running} data-morphed={morphed}
    role="button" tabIndex={0} aria-label="Изменить форму энергетической скульптуры" aria-pressed={morphed}
    onClick={() => setMorphed(value => !value)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setMorphed(value => !value) } }}
    onPointerMove={event => {
      if (event.pointerType === 'touch' || reduced || paused) return
      const r = event.currentTarget.getBoundingClientRect()
      pointer.current = {x: (event.clientX-r.left)/r.width*2-1, y: 1-(event.clientY-r.top)/r.height*2}
    }} onPointerLeave={() => {pointer.current={x:0,y:0}}}>
    {supported ? <Canvas camera={{position:[0,0,7.4],fov:42,near:.1,far:30}} dpr={low ? 1 : [1,1.5]} frameloop={running ? 'always' : 'demand'}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} aria-label="Интерактивная серебристо-синяя энергетическая скульптура">
      <CanvasHealth onReady={onReady} onUnavailable={onUnavailable}/><Sculpture reduced={reduced} paused={!running} low={low} pointer={pointer} morphed={morphed}/>
    </Canvas> : <SceneFallback/>}
  </div>
}
