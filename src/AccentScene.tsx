import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { AccentKind } from './AccentObject'
import AdaptiveQuality from './AdaptiveQuality'
import CanvasHealth from './CanvasHealth'
import { RubikController } from './rubikModel'
import { createRubikRig } from './rubikRig'
import StudioLighting from './StudioLighting'
import { ChromeKnot, GlassPolyhedron } from './Sculptures'
import type { ObjectInteraction } from './objectInteraction'
import useObjectMotion from './useObjectMotion'
import { getWebGLProfile } from './webglProfile'

type Props = { kind: AccentKind; reduced: boolean; paused: boolean; low: boolean; interaction: ObjectInteraction; onReady: () => void; onUnavailable: () => void }
function MotionDriver({ paused, reduced }: Pick<Props, 'paused' | 'reduced'>) {
  const { invalidate } = useThree()
  useEffect(() => {
    invalidate()
  }, [invalidate, paused, reduced])
  return null
}
function Rubik({ paused, reduced, low, interaction }: Pick<Props, 'paused' | 'reduced' | 'low' | 'interaction'>) {
  const group = useRef<THREE.Group>(null)
  useObjectMotion(interaction,paused,reduced)
  const serial=useRef(0)
  const controller = useMemo(() => new RubikController(), [])
  const rig = useMemo(() => createRubikRig(controller.cells, low), [controller, low])
  const smoothPointer = useRef({ x: 0, y: 0 })
  const freshFrame = useRef(true)
  const synchronizedTurns=useRef(-1)
  useLayoutEffect(()=>{freshFrame.current=true},[paused,reduced])
  useLayoutEffect(() => {
    if (reduced) controller.finishPending()
    serial.current=interaction.serial
    rig.sync(controller.active?.move ?? null)
    synchronizedTurns.current=controller.completedTurns
    rig.rotate(controller.angle)
  }, [reduced, controller, rig, interaction])
  useEffect(() => () => rig.dispose(), [rig])
  useFrame((_, delta) => {
    if (paused || reduced) return
    const dt = freshFrame.current || !Number.isFinite(delta) ? 0 : Math.max(0,delta)
    freshFrame.current=false
    if(serial.current!==interaction.serial){serial.current=interaction.serial;controller.requestCombo()}
    controller.advance(dt)
    const move = controller.active?.move ?? null
    if (move !== rig.currentMove || synchronizedTurns.current!==controller.completedTurns) {rig.sync(move);synchronizedTurns.current=controller.completedTurns}
    rig.rotate(controller.angle)
    smoothPointer.current.x = THREE.MathUtils.damp(smoothPointer.current.x, interaction.x, 4, dt)
    smoothPointer.current.y = THREE.MathUtils.damp(smoothPointer.current.y, interaction.y, 4, dt)
    if (group.current) {
      group.current.position.y=Math.sin(interaction.time*.7)*.045
      group.current.rotation.x = .4 + smoothPointer.current.y * .06 + Math.sin(interaction.time * .17) * .025
      group.current.rotation.y = -.55 + interaction.time * .25228125 + smoothPointer.current.x * .08
    }
  })
  return <group ref={group} rotation={[.4, -.55, .02]}><primitive object={rig.root} dispose={null}/></group>
}
export default function AccentScene(props: Props) {
  const [profile]=useState(getWebGLProfile)
  const [software,setSoftware]=useState(profile.software)
  const low=props.low||(software&&props.kind==='cube')
  const supported = profile.supported
  useEffect(() => { if (!supported) props.onUnavailable() }, [supported, props.onUnavailable])
  if (!supported) return null
  return <Canvas onCreated={({gl})=>{
    const context=gl.getContext(),debug=context.getExtension('WEBGL_debug_renderer_info')
    const renderer=String(context.getParameter(debug?debug.UNMASKED_RENDERER_WEBGL:context.RENDERER))
    setSoftware(/swiftshader|llvmpipe|softpipe|software/i.test(renderer))
  }} camera={{ position: [0, props.kind === 'cube' ? 0 : .1, props.kind === 'cube' ? 7.8 : 6.2], fov: 38 }} frameloop={props.paused || props.reduced ? 'demand' : 'always'} dpr={low ? 1 : [1, 1.5]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} aria-label={props.kind === 'cube' ? 'Вращающийся 3D-кубик Рубика' : props.kind === 'glass' ? 'Стеклянный многогранник. Перетаскивайте мышью или используйте стрелки для вращения' : 'Хромированный узел. Перетаскивайте мышью или используйте стрелки для вращения'}>
    <AdaptiveQuality low={low} active={!props.paused&&!props.reduced}><CanvasHealth onReady={props.onReady} onUnavailable={props.onUnavailable}/><MotionDriver paused={props.paused} reduced={props.reduced}/><StudioLighting low={low} monochrome={true}/>
    {props.kind === 'cube' ? <Rubik interaction={props.interaction} paused={props.paused} reduced={props.reduced} low={low}/> : props.kind === 'glass' ? <GlassPolyhedron simple={software} interaction={props.interaction} paused={props.paused} reduced={props.reduced} low={low}/> : <ChromeKnot interaction={props.interaction} paused={props.paused} reduced={props.reduced} low={low}/>}
  </AdaptiveQuality></Canvas>
}
