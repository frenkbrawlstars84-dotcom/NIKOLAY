import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import SceneFallback from './SceneFallback'
import CanvasHealth from './CanvasHealth'

type IntroFrame = { x: number; y: number; width: number; height: number }
type SceneProps = { progress: RefObject<number>; reduced: boolean; paused: boolean; anchor: RefObject<HTMLDivElement | null>; onReady: () => void; onUnavailable: () => void }
const vertex = `
  uniform float uTime;
  uniform float uProgress;
  uniform float uReveal;
  attribute float aStrand;
  attribute float aPath;
  varying float vLight;
  varying float vDepth;
  void main() {
    float t = uTime * .16;
    float unfurl = smoothstep(.08, .64, uProgress);
    vec3 p = position;
    p.xy *= 1. + .06 * sin(p.z * 1.7 + t);
    p.x += sin(p.y * 1.3 + t) * .08;
    // Each strand unwinds into a helix along a 38-unit corridor.
    // All geometry is deterministic: reverse scrolling retraces the same path.
    float angle = aStrand * 6.283185 + aPath * 15.70796 + t * .18;
    float radius = 1.48 + .12 * sin(aPath * 12.56 + aStrand * 18.85);
    vec3 corridor = vec3(cos(angle) * radius, sin(angle) * radius, -aPath * 38.);
    p = mix(p, corridor, unfurl);
    p.xy *= 1. + .11 * sin(aPath * 6.28 + uProgress * 3.14) * unfurl;
    vLight = .3 + .7 * pow(.5 + .5 * sin(aStrand * 28. + aPath * 14. + t), 2.);
    vec4 viewPosition = modelViewMatrix * vec4(p * uReveal, 1.);
    vDepth = -viewPosition.z;
    gl_Position = projectionMatrix * viewPosition;
  }
`
const fragment = `
  uniform float uProgress;
  varying float vLight;
  varying float vDepth;
  void main() {
    float fog = smoothstep(.15, 1.6, vDepth) * (1. - smoothstep(17., 35., vDepth));
    float exitFade = 1. - smoothstep(.91, 1., uProgress);
    gl_FragColor = vec4(vec3(.76, .80, .85) * vLight, .62 * (.35 + .65 * vLight) * fog * exitFade);
  }
`
const particleVertex = `
  uniform float uProgress;
  uniform float uTime;
  uniform float uDpr;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.xy += vec2(sin(p.z + uTime * .12), cos(p.z * .3 + uTime * .1)) * .06;
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    float depth = -mv.z;
    vAlpha = (.16 + .84 * smoothstep(.28, .55, uProgress)) * (1. - smoothstep(.88, 1., uProgress));
    vAlpha *= smoothstep(.1, 1., depth) * (1. - smoothstep(18., 32., depth));
    gl_PointSize = clamp(15. / max(depth, .5), 1., 4.) * uDpr;
    gl_Position = projectionMatrix * mv;
  }
`
const particleFragment = `
  varying float vAlpha;
  void main() {
    float spot = 1. - smoothstep(.05, .5, length(gl_PointCoord - vec2(.5)));
    gl_FragColor = vec4(.79, .84, .93, vAlpha * spot * .55);
  }
`

function Sculpture({ progress, reduced, paused, low, frame }: Omit<SceneProps, 'anchor' | 'onReady' | 'onUnavailable'> & { low: boolean; frame: RefObject<IntroFrame> }) {
  const object = useRef<THREE.Group>(null)
  const { invalidate, camera, size, gl } = useThree()
  const pointer = useRef({ x: 0, y: 0 })
  const clock = useRef(0)
  const smoothedProgress = useRef(0)
  useEffect(() => {
    if (reduced || paused) return
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') pointer.current = { x: e.clientX / innerWidth * 2 - 1, y: 1 - e.clientY / innerHeight * 2 }
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [reduced, paused])
  useEffect(() => {
    invalidate()
    if (reduced || paused) return
    let raf = 0, last = 0
    const tick = (now: number) => {
      if (now - last >= 1000 / (low ? 30 : 60) - .5) { invalidate(); last = now }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [invalidate, reduced, paused, low])

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vertex, fragmentShader: fragment, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uProgress: { value: 0 }, uReveal: { value: reduced ? 1 : 0 } },
  }), [reduced])
  const geometry = useMemo(() => {
    const strands = low ? 36 : 76, segments = low ? 104 : 168
    const points: number[] = [], ids: number[] = [], paths: number[] = []
    for (let j = 0; j < strands; j++) {
      const f = j / strands, a = f * Math.PI * 2
      for (let k = 0; k < segments; k++) for (const n of [k, k + 1]) {
        const t = n / segments * Math.PI * 2, radius = 1.55 + .46 * Math.cos(3 * t + a)
        points.push(radius * Math.cos(t), radius * Math.sin(t), .57 * Math.sin(3 * t + a) + .17 * Math.cos(a))
        ids.push(f); paths.push(n / segments)
      }
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    result.setAttribute('aStrand', new THREE.Float32BufferAttribute(ids, 1))
    result.setAttribute('aPath', new THREE.Float32BufferAttribute(paths, 1))
    return result
  }, [low])
  const particleGeometry = useMemo(() => {
    const points: number[] = [], count = low ? 80 : 220
    for (let i = 0; i < count; i++) {
      const angle = i * 2.39996, radius = 1.2 + ((i * .618) % 1) * 1.7
      points.push(Math.cos(angle) * radius, Math.sin(angle) * radius, -((i * .3819) % 1) * 38)
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    return result
  }, [low])
  const particleMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: particleVertex, fragmentShader: particleFragment, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uProgress: { value: 0 }, uDpr: { value: 1 } },
  }), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])
  useEffect(() => () => particleGeometry.dispose(), [particleGeometry])
  useEffect(() => () => particleMaterial.dispose(), [particleMaterial])

  useFrame((_, delta) => {
    const dt = Math.min(delta, .05)
    if (!paused && !reduced) clock.current += dt
    smoothedProgress.current = reduced ? 0 : THREE.MathUtils.damp(smoothedProgress.current, progress.current, 10, dt)
    const p = smoothedProgress.current
    const center = THREE.MathUtils.smoothstep(p, .24, .52)
    const depth = THREE.MathUtils.smoothstep(p, .38, .93)
    material.uniforms.uTime.value = clock.current
    material.uniforms.uProgress.value = p
    material.uniforms.uReveal.value = paused || reduced ? 1 : THREE.MathUtils.damp(material.uniforms.uReveal.value, 1, 3.2, dt)
    particleMaterial.uniforms.uProgress.value = p
    particleMaterial.uniforms.uTime.value = clock.current
    particleMaterial.uniforms.uDpr.value = gl.getPixelRatio()
    // The initial scale/position is measured from the empty, protected hero viewport.
    const worldHeight = 2 * 7.4 * Math.tan(42 * Math.PI / 360)
    const worldWidth = worldHeight * size.width / size.height
    const introScale = Math.min(frame.current.width * worldWidth, frame.current.height * worldHeight) / 4.7
    if (object.current) {
      object.current.position.set(frame.current.x * worldWidth * (1 - center), frame.current.y * worldHeight * (1 - center), 0)
      object.current.scale.setScalar(THREE.MathUtils.lerp(introScale, 1, center))
      object.current.rotation.set(
        (.3 + (reduced ? 0 : pointer.current.y * .15)) * (1 - center),
        (-.4 + (reduced ? 0 : pointer.current.x * .2 + Math.sin(clock.current * .07) * .15)) * (1 - center),
        -.35 * (1 - center),
      )
    }
    camera.position.z = 7.4 - depth * 30
  })
  return <><group ref={object}><lineSegments geometry={geometry} material={material} frustumCulled={false} /></group><points geometry={particleGeometry} material={particleMaterial} frustumCulled={false}/></>
}

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
  const frame = useRef<IntroFrame>({ x: .25, y: 0, width: .5, height: .65 })
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
  return <div ref={host} className="scene-host">{supported ? <Canvas
    aria-label="Процедурная спираль, переходящая при прокрутке в трёхмерный коридор"
    camera={{ position: [0, 0, 7.4], fov: 42, near: .1, far: 70 }} dpr={low ? 1 : [1, 1.5]} frameloop="demand"
    gl={{ antialias: !low, alpha: true, powerPreference: 'low-power' }}
  ><CanvasHealth onReady={onReady} onUnavailable={onUnavailable}/><Sculpture progress={progress} reduced={reduced} paused={paused || !visible || !inView} low={low} frame={frame} /></Canvas> : <SceneFallback />}</div>
}
