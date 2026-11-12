import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import useTactile from './useTactile'
import SceneFallback from './SceneFallback'
import CanvasHealth from './CanvasHealth'
import useSceneBudget from './useSceneBudget'

type IntroFrame = { x: number; y: number; width: number; height: number }
type SceneProps = { progress: RefObject<number>; reduced: boolean; paused: boolean; anchor: RefObject<HTMLDivElement | null>; onReady: () => void; onUnavailable: () => void }
const vertex = `
  uniform float uTime;
  uniform float uProgress;
  uniform float uReveal;
  uniform float uMorph;
  uniform float uHover;
  attribute float aSide;
  attribute float aStrand;
  attribute float aPath;
  varying vec3 vViewPosition;
  varying float vLight;
  varying float vDepth;
  void main() {
    float t = uTime * .16;
    float unfurl = smoothstep(.10, .48, uProgress);
    vec3 p = position;
    p.xy *= 1. + .06 * sin(p.z * 1.7 + t);
    p.x += sin(p.y * 1.3 + t) * .08;
    float path=aPath*6.283185;
    float azimuth=aStrand*6.283185;
    vec3 opened=vec3(cos(path)*(1.45+.32*cos(azimuth)),sin(path)*(1.45+.32*cos(azimuth)),sin(azimuth)*.75+sin(path*2.+azimuth)*.24);
    p=mix(p,opened,uMorph*(1.-smoothstep(.06,.24,uProgress)));
    // Indexed two-sided ribbons use the same vertices for the scroll corridor.
    p.xy+=vec2(cos(path),sin(path))*aSide*(.012+uHover*.003);
    p*=1.+uHover*.018;
    // The same vertices become longitudinal filaments, rather than circular
    // rings. Camera travel creates optic flow through this continuous corridor.
    float angle = aStrand * 6.283185 + aPath * 1.25 + sin(aPath * 5. + aStrand * 12.) * .12;
    float radius = 2.7 + sin(aStrand * 18.85) * .32 + sin(aPath * 8. + aStrand * 6.28) * .16;
    vec3 corridor = vec3(cos(angle) * radius, sin(angle) * radius, 3. - aPath * 35.);
    p = mix(p, corridor, unfurl);
    vLight = .3 + .7 * pow(.5 + .5 * sin(aStrand * 28. + aPath * 14. + t), 2.);
    vec4 viewPosition = modelViewMatrix * vec4(p * uReveal, 1.);
    vViewPosition=viewPosition.xyz;
    vDepth = -viewPosition.z;
    gl_Position = projectionMatrix * viewPosition;
  }
`
const fragment = `
  uniform float uProgress;
  uniform float uFlash;
  varying vec3 vViewPosition;
  varying float vLight;
  varying float vDepth;
  void main() {
    float fog = smoothstep(.15, 1.6, vDepth) * (1. - smoothstep(17., 35., vDepth));
    float exitFade = 1. - smoothstep(.84, 1., uProgress);
    float weight = mix(.62, .17, smoothstep(.2, .46, uProgress));
    vec3 normal=normalize(cross(dFdx(vViewPosition),dFdy(vViewPosition)));
    float facing=abs(dot(normal,normalize(-vViewPosition)));
    float studio=pow(abs(dot(normal,normalize(vec3(-.6,.8,1.)))),7.);
    float rim=pow(1.-facing,2.);
    vec3 silver=mix(vec3(.15,.23,.36),vec3(.84,.91,1.),clamp(studio*.8+rim*.55+vLight*.38,0.,1.));
    gl_FragColor = vec4(silver+vec3(.24,.45,.8)*uFlash*.45, (.8+weight*.2)*fog*exitFade);
  }
`
const particleVertex = `
  uniform float uProgress;
  uniform float uTime;
  attribute float aTip;
  attribute float aSeed;
  varying float vAlpha;
  varying float vTip;
  void main() {
    vec3 p = position;
    float flight = smoothstep(.16, .55, uProgress);
    p.xy += vec2(sin(p.z + uTime * .07), cos(p.z * .3 + uTime * .06)) * .025;
    p.z += aTip * (.015 + flight * (.2 + aSeed * .45));
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    float depth = -mv.z;
    vAlpha = (.1 + .9 * flight) * (1. - smoothstep(.88, 1., uProgress));
    vAlpha *= smoothstep(.2, 1.2, depth) * (1. - smoothstep(35., 65., depth));
    vTip = aTip;
    gl_Position = projectionMatrix * mv;
  }
`
const particleFragment = `
  uniform float uProgress;
  varying float vAlpha;
  varying float vTip;
  void main() {
    gl_FragColor = vec4(.88, .89, .92, vAlpha * (.2 + .8 * vTip) * .18);
  }
`

function Sculpture({ progress, reduced, paused, low, frame, anchor }: Omit<SceneProps, 'onReady'|'onUnavailable'> & { low: boolean; frame: RefObject<IntroFrame> }) {
  const interaction=useTactile(reduced,'Металлический портал: нажмите для раскрытия лент; повторно — собрать. Прокрутите для погружения',anchor,()=>progress.current<.18)
  const object = useRef<THREE.Group>(null)
  const { invalidate, camera, size } = useThree()
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
  }, [invalidate, reduced, paused])

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vertex, fragmentShader: fragment, transparent: true,
    depthTest: true, depthWrite: true, side: THREE.DoubleSide,
    uniforms: { uMorph:{value:0}, uHover:{value:0}, uFlash:{value:0}, uTime: { value: 0 }, uProgress: { value: 0 }, uReveal: { value: reduced ? 1 : 0 } },
  }), [reduced])
  const geometry = useMemo(() => {
    const strands = low ? 24 : 44, segments = low ? 104 : 168
    const points: number[] = [], ids: number[] = [], paths: number[] = [], sides: number[] = [], indices: number[] = []
    for (let j = 0; j < strands; j++) {
      const f = j / strands, a = f * Math.PI * 2, base=points.length/3
      for (let k = 0; k <= segments; k++) for (const side of [-1,1]) {
        const t = k / segments * Math.PI * 2, radius = 1.55 + .46 * Math.cos(3 * t + a)
        points.push(radius * Math.cos(t), radius * Math.sin(t), .57 * Math.sin(3 * t + a) + .17 * Math.cos(a))
        ids.push(f); paths.push(k / segments); sides.push(side)
      }
      for(let k=0;k<segments;k++){const n=base+k*2;indices.push(n,n+1,n+2,n+1,n+3,n+2)}
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    result.setAttribute('aStrand', new THREE.Float32BufferAttribute(ids, 1))
    result.setAttribute('aPath', new THREE.Float32BufferAttribute(paths, 1))
    result.setAttribute('aSide', new THREE.Float32BufferAttribute(sides, 1));result.setIndex(indices)
    return result
  }, [low])
  const particleGeometry = useMemo(() => {
    const points: number[] = [], tips: number[] = [], seeds: number[] = [], count = low ? 150 : 380
    for (let i = 0; i < count; i++) {
      const angle = i * 2.39996, radius = 2.3 + ((i * .618) % 1) * 7
      for (const tip of [0,1]) {
        points.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 3 - ((i * .3819) % 1) * 60)
        tips.push(tip); seeds.push((i*.754877)%1)
      }
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    result.setAttribute('aTip', new THREE.Float32BufferAttribute(tips, 1))
    result.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1))
    return result
  }, [low])
  const particleMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: particleVertex, fragmentShader: particleFragment, transparent: true,
    depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uProgress: { value: 0 } },
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
    const center = THREE.MathUtils.smoothstep(p, .16, .4)
    material.uniforms.uMorph.value=interaction.current.value
    material.uniforms.uHover.value=interaction.current.hover
    material.uniforms.uFlash.value=interaction.current.flash
    material.uniforms.uTime.value = clock.current
    material.uniforms.uProgress.value = p
    material.uniforms.uReveal.value = paused || reduced ? 1 : THREE.MathUtils.damp(material.uniforms.uReveal.value, 1, 3.2, dt)
    particleMaterial.uniforms.uProgress.value = p
    particleMaterial.uniforms.uTime.value = clock.current
    // The initial scale/position is measured from the empty, protected hero viewport.
    const worldHeight = 2 * 7.4 * Math.tan(42 * Math.PI / 360)
    const worldWidth = worldHeight * size.width / size.height
    const introScale = Math.min(frame.current.width * worldWidth, frame.current.height * worldHeight) / 5.2
    if (object.current) {
      object.current.visible = p < .999
      object.current.position.set(frame.current.x * worldWidth * (1 - center), frame.current.y * worldHeight * (1 - center), 0)
      object.current.scale.setScalar(THREE.MathUtils.lerp(introScale, 1, center))
      object.current.rotation.set(
        (.3 + (reduced ? 0 : pointer.current.y * .15)) * (1 - center),
        (-.4 + (reduced ? 0 : pointer.current.x * .2 + Math.sin(clock.current * .07) * .15)) * (1 - center),
        -.35 * (1 - center),
      )
    }
    camera.position.z = THREE.MathUtils.lerp(7.4,-25,THREE.MathUtils.smoothstep(p,.2,1))
    camera.position.x = low ? 0 : Math.sin(p * Math.PI) * .08
    camera.position.y = Math.sin(p * Math.PI) * .04
  })
  return <><group ref={object}><mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={20}/></group><lineSegments geometry={particleGeometry} material={particleMaterial} frustumCulled={false} renderOrder={21}/></>
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
  const ownsFrame = useSceneBudget(host, supported)
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
  return <div ref={host} className="scene-host" data-scene-running={ownsFrame && !reduced && !paused && visible && inView}>{supported ? <Canvas
    aria-label="Энергетический портал и пространственный проход к проектам"
    camera={{ position: [0, 0, 7.4], fov: 42, near: .1, far: 70 }} dpr={low ? 1 : [1, 1.25]} frameloop={reduced || paused || !visible || !inView || !ownsFrame ? 'demand' : 'always'}
    gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
  ><CanvasHealth onReady={onReady} onUnavailable={onUnavailable}/><Sculpture progress={progress} reduced={reduced} paused={paused || !visible || !inView || !ownsFrame} low={low} frame={frame} anchor={anchor} /></Canvas> : <SceneFallback />}</div>
}
