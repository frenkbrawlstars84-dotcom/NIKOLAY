import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { AccentKind } from './AccentObject'
import useTactile from './useTactile'
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
  const interaction=useTactile(reduced,'Кубик Рубика: нажмите или Enter для короткой комбинации и обратной сборки')
  const lastTarget=useRef(0),manual=useRef(false)
  const {gl,invalidate}=useThree()
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
    const m=interaction.current
    if(m.target!==lastTarget.current){controller.requestCombination();manual.current=true;lastTarget.current=m.target;if(reduced) {controller.advance(.001,false);controller.finishPending()}}
    gl.domElement.dataset.cubeSolved=String(controller.solved)
    gl.domElement.dataset.cubeTurns=String(controller.completedTurns)
    if(controller.active)gl.domElement.dataset.interaction=controller.returning?'RETURN':'ACTIVE'
    if(group.current)group.current.scale.setScalar(1+m.hover*.018)
    if(rig.stickers[0].material instanceof THREE.MeshStandardMaterial){rig.stickers[0].material.emissive.set('#b6d2ff');rig.stickers[0].material.emissiveIntensity=m.flash*.22}
    if (reduced || (paused && !manual.current)) return
    if(paused && manual.current){const r=gl.domElement.getBoundingClientRect();if(document.hidden||r.bottom<=0||r.top>=innerHeight)return}

    const dt = freshFrame.current ? 0 : Math.min(delta, .1)
    freshFrame.current=false
    clock.current += dt
    controller.advance(dt,!paused)
    if(manual.current && controller.solved){manual.current=false;interaction.current.reset();lastTarget.current=0}
    if(manual.current)invalidate()
    const move = controller.active?.move ?? null
    if (move !== rig.currentMove) rig.sync(move)
    rig.rotate(controller.angle)
    smoothPointer.current.x = THREE.MathUtils.damp(smoothPointer.current.x, pointer.current.x, 4, dt)
    smoothPointer.current.y = THREE.MathUtils.damp(smoothPointer.current.y, pointer.current.y, 4, dt)
    if (group.current) {
      group.current.rotation.x = .4 + smoothPointer.current.y * .1 + Math.sin(clock.current * .17) * .025
      group.current.rotation.y = -.55 + clock.current * .095 + smoothPointer.current.x * .16
    }
  })
  return <group ref={group} rotation={[.4, -.55, .02]}><primitive object={rig.root} dispose={null}/></group>
}
export default function AccentScene(props: Props) {
  const supported = useMemo(() => {
    try { const gl = document.createElement('canvas').getContext('webgl2'); if (!gl) return false; gl.getExtension('WEBGL_lose_context')?.loseContext(); return true } catch { return false }
  }, [])
  useEffect(() => { if (!supported) props.onUnavailable() }, [supported, props.onUnavailable])
  if (!supported) return null
  return <Canvas camera={{ position: [0, props.kind === 'cube' ? 0 : .1, props.kind === 'cube' ? 7.8 : 6.2], fov: 38 }} frameloop={props.paused || props.reduced ? 'demand' : 'always'} dpr={props.low ? [1, 1.25] : [1, 1.5]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} aria-label={props.kind === 'cube' ? 'Вращающийся 3D-кубик Рубика' : props.kind === 'glass' ? 'Стеклянный многогранник. Перетаскивайте мышью или используйте стрелки для вращения' : 'Хромированный узел. Перетаскивайте мышью или используйте стрелки для вращения'}>
    <CanvasHealth onReady={props.onReady} onUnavailable={props.onUnavailable}/><MotionDriver paused={props.paused} reduced={props.reduced}/><StudioLighting low={props.low} monochrome={true}/>
    {props.kind === 'cube' ? <Rubik paused={props.paused} reduced={props.reduced} low={props.low}/> : props.kind === 'glass' ? <GlassPolyhedron paused={props.paused} reduced={props.reduced} low={props.low}/> : <ChromeKnot paused={props.paused} reduced={props.reduced} low={props.low}/>}
  </Canvas>
}
