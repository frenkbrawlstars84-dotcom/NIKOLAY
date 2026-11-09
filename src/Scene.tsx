import { Component, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

type SceneProps = { progress: RefObject<number>; reduced: boolean; paused: boolean }
const vertex = `
  uniform float uTime;
  uniform float uProgress;
  uniform float uReveal;
  attribute float aStrand;
  varying float vLight;
  void main() {
    vec3 p = position;
    float t = uTime * .16;
    float spread = smoothstep(.05, .85, uProgress);
    p.xy *= 1. + .08 * sin(p.z * 1.7 + t);
    p.x += sin(p.y * 1.3 + t) * .1;
    p += normalize(position + vec3(.01)) * spread * (.4 + sin(aStrand * 15.) * .3);
    p.z += sin(aStrand * 22. + p.y * 2. + t) * spread * 1.5;
    vLight = .34 + .66 * pow(.5 + .5 * sin(aStrand * 28. + p.z * 1.4 + t), 2.);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p * uReveal, 1.);
  }
`
const fragment = `
  varying float vLight;
  void main() {
    gl_FragColor = vec4(vec3(.76, .80, .85) * vLight, .72 * (.35 + .65 * vLight));
  }
`

function Sculpture({ progress, reduced, paused, low }: SceneProps & { low: boolean }) {
  const object = useRef<THREE.Group>(null)
  const { invalidate, camera } = useThree()
  const pointer = useRef({ x: 0, y: 0 })
  const clock = useRef(0)

  useEffect(() => {
    if (reduced || paused) return
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      pointer.current = { x: e.clientX / innerWidth * 2 - 1, y: 1 - e.clientY / innerHeight * 2 }
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [reduced, paused])

  // Demand rendering caps GPU work as well as JS updates. No render loop offscreen.
  useEffect(() => {
    invalidate()
    if (reduced || paused) return
    let frame = 0, last = 0
    const tick = (now: number) => {
      if (now - last >= 1000 / (low ? 30 : 60) - .5) { invalidate(); last = now }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [invalidate, reduced, paused, low])

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vertex, fragmentShader: fragment, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uProgress: { value: 0 }, uReveal: { value: reduced ? 1 : 0 } },
  }), [reduced])
  const geometry = useMemo(() => {
    const strands = low ? 40 : 84, segments = low ? 100 : 160
    const points: number[] = [], ids: number[] = []
    for (let j = 0; j < strands; j++) {
      const f = j / strands, a = f * Math.PI * 2
      for (let k = 0; k < segments; k++) {
        for (const n of [k, k + 1]) {
          const t = n / segments * Math.PI * 2
          const radius = 1.55 + .46 * Math.cos(3 * t + a)
          points.push(radius * Math.cos(t), radius * Math.sin(t), .57 * Math.sin(3 * t + a) + .17 * Math.cos(a))
          ids.push(f)
        }
      }
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    result.setAttribute('aStrand', new THREE.Float32BufferAttribute(ids, 1))
    return result
  }, [low])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  useFrame((_, delta) => {
    const dt = Math.min(delta, .05)
    if (!paused && !reduced) clock.current += dt
    const p = reduced ? 0 : progress.current
    material.uniforms.uTime.value = clock.current
    material.uniforms.uProgress.value = p
    material.uniforms.uReveal.value = paused || reduced ? 1 : THREE.MathUtils.damp(material.uniforms.uReveal.value, 1, 2.8, dt)
    if (object.current) {
      object.current.rotation.x = THREE.MathUtils.damp(object.current.rotation.x, .3 + (reduced ? 0 : pointer.current.y * .12 + p * .55), 3, dt)
      object.current.rotation.y = THREE.MathUtils.damp(object.current.rotation.y, -.4 + (reduced ? 0 : pointer.current.x * .15 + clock.current * .07 + p * .9), 3, dt)
      object.current.rotation.z = -.35
    }
    camera.position.z = THREE.MathUtils.damp(camera.position.z, 7.4 - p * .7, 3, dt)
  })
  return <group ref={object}><lineSegments geometry={geometry} material={material} /></group>
}

class Boundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}
function Fallback() {
  return <div className="scene-fallback" aria-label="Статичная графическая версия скульптуры"><svg viewBox="0 0 600 600" fill="none">{Array.from({ length: 45 }, (_, i) => <ellipse key={i} cx="300" cy="300" rx={90 + i * 3} ry={180 - i * 2.4} transform={`rotate(${i * 4} 300 300)`} stroke="#b7bdc5" strokeOpacity=".35" strokeWidth=".65" />)}</svg></div>
}
export default function Scene({ progress, reduced, paused }: SceneProps) {
  const [supported] = useState(() => {
    try {
      const gl = document.createElement('canvas').getContext('webgl2')
      if (!gl) return false
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      return true
    } catch { return false }
  })
  const [visible, setVisible] = useState(!document.hidden)
  const host = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(true)
  const [low, setLow] = useState(() => matchMedia('(max-width: 900px)').matches || navigator.hardwareConcurrency <= 4)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting))
    if (host.current) observer.observe(host.current)
    const media = matchMedia('(max-width: 900px)')
    const resize = () => setLow(media.matches || navigator.hardwareConcurrency <= 4)
    const visibility = () => setVisible(!document.hidden)
    media.addEventListener('change', resize)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      observer.disconnect()
      media.removeEventListener('change', resize)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])
  return <div ref={host} className="scene-host"><Boundary fallback={<Fallback />}>{supported ? <Canvas
    aria-label="Интерактивная процедурная скульптура из серебристых линий"
    camera={{ position: [0, 0, 7.4], fov: 42 }} dpr={low ? 1 : [1, 1.5]} frameloop="demand"
    gl={{ antialias: !low, alpha: true, powerPreference: 'low-power' }}
  ><Sculpture progress={progress} reduced={reduced} paused={paused || !visible || !inView} low={low} /></Canvas> : <Fallback />}</Boundary></div>
}
