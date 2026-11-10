import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { AccentKind } from './AccentObject'
import CanvasHealth from './CanvasHealth'
import { RubikController } from './rubikModel'
import { createRubikRig } from './rubikRig'

type Props = { kind: AccentKind; reduced: boolean; paused: boolean; low: boolean; onReady: () => void; onUnavailable: () => void }
function MotionDriver({ paused, reduced }: Pick<Props, 'paused' | 'reduced'>) {
  const { invalidate } = useThree()
  useEffect(() => {
    invalidate()
  }, [invalidate, paused, reduced])
  return null
}
function Studio({ low, monochrome }: { low: boolean; monochrome: boolean }) {
  const { scene } = useThree()
  const environment = useMemo(() => {
    const size = low ? 64 : 128
    const faces = Array.from({ length: 6 }, (_, side) => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = size
      const paint = canvas.getContext('2d')!
      const gradient = paint.createLinearGradient(0, 0, size, size)
      gradient.addColorStop(0, side === 2 ? '#ededed' : monochrome ? '#252525' : '#1c293e'); gradient.addColorStop(.46, monochrome ? '#737373' : '#52677f'); gradient.addColorStop(.53, monochrome ? '#d6d6d6' : '#bacbdc'); gradient.addColorStop(.68, monochrome ? '#383838' : '#263851'); gradient.addColorStop(1, monochrome ? '#111111' : '#0b1220')
      paint.fillStyle = gradient; paint.fillRect(0, 0, size, size)
      paint.fillStyle = monochrome ? '#ffffff' : '#e7f0ff'; paint.globalAlpha = side % 2 ? .72 : .3; paint.fillRect(size * .15, size * .08, size * .13, size * .72)
      return canvas
    })
    const texture = new THREE.CubeTexture(faces); texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true
    return texture
  }, [low, monochrome])
  useLayoutEffect(() => { const previous = scene.environment; scene.environment = environment; return () => { scene.environment = previous } }, [scene, environment])
  useEffect(() => () => environment.dispose(), [environment])
  return <><ambientLight intensity={.6}/><directionalLight position={[4, 6, 5]} intensity={3} color={monochrome ? '#ffffff' : '#d6e6ff'}/><directionalLight position={[-4, 1, 2]} intensity={1.1} color={monochrome ? '#d9d9d9' : '#7f98c5'}/><directionalLight position={[0, -3, -3]} intensity={.8} color={monochrome ? '#b8b8b8' : '#c6a5b5'}/></>
}
function usePose(paused: boolean, reduced: boolean) {
  const clock = useRef(0), pointer = useRef({ x: 0, y: 0 })
  useEffect(() => {
    if (paused || reduced) return
    const move = (e: PointerEvent) => { if (e.pointerType !== 'touch') pointer.current = { x: e.clientX / innerWidth - .5, y: e.clientY / innerHeight - .5 } }
    window.addEventListener('pointermove', move, { passive: true }); return () => window.removeEventListener('pointermove', move)
  }, [paused, reduced])
  return { clock, pointer }
}
function Rubik({ paused, reduced, low }: Pick<Props, 'paused' | 'reduced' | 'low'>) {
  const group = useRef<THREE.Group>(null)
  const { clock, pointer } = usePose(paused, reduced)
  const controller = useMemo(() => new RubikController(), [])
  const rig = useMemo(() => createRubikRig(controller.cells, low), [controller, low])
  const smoothPointer = useRef({ x: 0, y: 0 })
  useLayoutEffect(() => {
    if (reduced) controller.finishPending()
    rig.sync(controller.active?.move ?? null)
  }, [reduced, controller, rig])
  useEffect(() => () => rig.dispose(), [rig])
  useFrame((_, delta) => {
    if (paused || reduced) return
    const dt = Math.min(delta, .05)
    clock.current += dt
    controller.advance(dt)
    const move = controller.active?.move ?? null
    if (move !== rig.currentMove) rig.sync(move)
    rig.rotate(controller.angle)
    smoothPointer.current.x = THREE.MathUtils.damp(smoothPointer.current.x, pointer.current.x, 4, dt)
    smoothPointer.current.y = THREE.MathUtils.damp(smoothPointer.current.y, pointer.current.y, 4, dt)
    if (group.current) {
      group.current.rotation.x = .4 + smoothPointer.current.y * .1 + Math.sin(clock.current * .17) * .025
      group.current.rotation.y = -.55 + clock.current * .065 + smoothPointer.current.x * .16
    }
  })
  return <group ref={group} rotation={[.4, -.55, .02]}><primitive object={rig.root} dispose={null}/></group>
}
function Signal({ paused, reduced, low }: Pick<Props, 'paused' | 'reduced' | 'low'>) {
  const group = useRef<THREE.Group>(null)
  const { clock, pointer } = usePose(paused, reduced)
  const geometry = useMemo(() => new THREE.TorusKnotGeometry(1, .14, low ? 70 : 144, low ? 8 : 16, 2, 3), [low])
  const wire = useMemo(() => { const ico = new THREE.IcosahedronGeometry(1.8, 0); const edges = new THREE.EdgesGeometry(ico); ico.dispose(); return edges }, [])
  useEffect(() => () => geometry.dispose(), [geometry]); useEffect(() => () => wire.dispose(), [wire])
  useFrame((_, delta) => {
    const dt = Math.min(delta, .06); if (!paused && !reduced) clock.current += dt
    if (group.current) { group.current.rotation.y = clock.current * .16 + pointer.current.x * .15; group.current.rotation.x = .3 + Math.sin(clock.current * .2) * .12 + pointer.current.y * .1 }
  })
  return <group ref={group} rotation={[.3, 0, 0]}><mesh geometry={geometry}><meshStandardMaterial color="#b4c5dc" metalness={.95} roughness={.19}/></mesh><lineSegments geometry={wire}><lineBasicMaterial color="#a0b9db" transparent opacity={.15}/></lineSegments></group>
}
export default function AccentScene(props: Props) {
  const supported = useMemo(() => {
    try { const gl = document.createElement('canvas').getContext('webgl2'); if (!gl) return false; gl.getExtension('WEBGL_lose_context')?.loseContext(); return true } catch { return false }
  }, [])
  useEffect(() => { if (!supported) props.onUnavailable() }, [supported, props.onUnavailable])
  if (!supported) return null
  return <Canvas camera={{ position: [0, props.kind === 'cube' ? 0 : .1, props.kind === 'cube' ? 7.8 : 6.2], fov: 38 }} frameloop={props.paused || props.reduced ? 'demand' : 'always'} dpr={props.low ? [1, 1.25] : [1, 1.5]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} aria-label={props.kind === 'cube' ? 'Вращающийся 3D-кубик Рубика' : 'Хромированная пространственная скульптура'}>
    <CanvasHealth onReady={props.onReady} onUnavailable={props.onUnavailable}/><MotionDriver paused={props.paused} reduced={props.reduced}/><Studio low={props.low} monochrome={props.kind === 'cube'}/>
    {props.kind === 'cube' ? <Rubik paused={props.paused} reduced={props.reduced} low={props.low}/> : <Signal paused={props.paused} reduced={props.reduced} low={props.low}/>}
  </Canvas>
}
