import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { AccentKind } from './AccentObject'
import CanvasHealth from './CanvasHealth'
import { RubikController } from './rubikModel'
import { createRubikRig } from './rubikRig'
import StudioLighting from './StudioLighting'
import { ChromeKnot, GlassPolyhedron } from './Sculptures'

type Props = { kind: AccentKind; reduced: boolean; paused: boolean; low: boolean; onReady: () => void; onUnavailable: () => void }
function MotionDriver({ paused, reduced }: Pick<Props, 'paused' | 'reduced'>) {
  const { invalidate } = useThree()
  useEffect(() => {
    invalidate()
  }, [invalidate, paused, reduced])
  return null
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
  const freshFrame = useRef(true)
  useLayoutEffect(()=>{freshFrame.current=true},[paused,reduced])
  useLayoutEffect(() => {
    if (reduced) controller.finishPending()
    rig.sync(controller.active?.move ?? null)
    rig.rotate(controller.angle)
  }, [reduced, controller, rig])
  useEffect(() => () => rig.dispose(), [rig])
  useFrame((_, delta) => {
    if (paused || reduced) return
    const dt = freshFrame.current || !Number.isFinite(delta) ? 0 : Math.max(0,delta)
    freshFrame.current=false
    clock.current += dt
    controller.advance(dt)
    const move = controller.active?.move ?? null
    if (move !== rig.currentMove) rig.sync(move)
    rig.rotate(controller.angle)
    smoothPointer.current.x = THREE.MathUtils.damp(smoothPointer.current.x, pointer.current.x, 4, dt)
    smoothPointer.current.y = THREE.MathUtils.damp(smoothPointer.current.y, pointer.current.y, 4, dt)
    if (group.current) {
      group.current.rotation.x = .4 + smoothPointer.current.y * .1 + Math.sin(clock.current * .17) * .025
      group.current.rotation.y = -.55 + clock.current * .0975 + smoothPointer.current.x * .16
    }
  })
  return <group ref={group} rotation={[.4, -.55, .02]}><primitive object={rig.root} dispose={null}/></group>
}
export default function AccentScene(props: Props) {
  const [software,setSoftware]=useState(false)
  const low=props.low||(software&&props.kind==='cube')
  const supported = useMemo(() => {
    try { const gl = document.createElement('canvas').getContext('webgl2'); if (!gl) return false; gl.getExtension('WEBGL_lose_context')?.loseContext(); return true } catch { return false }
  }, [])
  useEffect(() => { if (!supported) props.onUnavailable() }, [supported, props.onUnavailable])
  if (!supported) return null
  return <Canvas onCreated={({gl})=>{
    const context=gl.getContext(),debug=context.getExtension('WEBGL_debug_renderer_info')
    const renderer=String(context.getParameter(debug?debug.UNMASKED_RENDERER_WEBGL:context.RENDERER))
    setSoftware(/swiftshader|llvmpipe|softpipe|software/i.test(renderer))
  }} camera={{ position: [0, props.kind === 'cube' ? 0 : .1, props.kind === 'cube' ? 7.8 : 6.2], fov: 38 }} frameloop={props.paused || props.reduced ? 'demand' : 'always'} dpr={low ? 1 : [1, 1.5]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} aria-label={props.kind === 'cube' ? 'Вращающийся 3D-кубик Рубика' : props.kind === 'glass' ? 'Стеклянный многогранник. Перетаскивайте мышью или используйте стрелки для вращения' : 'Хромированный узел. Перетаскивайте мышью или используйте стрелки для вращения'}>
    <CanvasHealth onReady={props.onReady} onUnavailable={props.onUnavailable}/><MotionDriver paused={props.paused} reduced={props.reduced}/><StudioLighting low={low} monochrome={true}/>
    {props.kind === 'cube' ? <Rubik paused={props.paused} reduced={props.reduced} low={low}/> : props.kind === 'glass' ? <GlassPolyhedron paused={props.paused} reduced={props.reduced} low={low}/> : <ChromeKnot paused={props.paused} reduced={props.reduced} low={low}/>}
  </Canvas>
}
