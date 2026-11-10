import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { AccentKind } from './AccentObject'
import CanvasHealth from './CanvasHealth'
import { RubikController, selected } from './rubikModel'

type Props = { kind: AccentKind; reduced: boolean; paused: boolean; low: boolean; onReady: () => void; onUnavailable: () => void; turnRequest: number }
function MotionDriver({ paused, reduced, low }: Pick<Props, 'paused' | 'reduced' | 'low'>) {
  const { invalidate } = useThree()
  useEffect(() => {
    invalidate()
    if (paused || reduced) return
    let frame = 0, last = 0
    const tick = (now: number) => { if (now - last >= 1000 / (low ? 24 : 45) - .5) { invalidate(); last = now }; frame = requestAnimationFrame(tick) }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [invalidate, paused, reduced, low])
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
function Rubik({ paused, reduced, low, turnRequest }: Pick<Props, 'paused' | 'reduced' | 'low' | 'turnRequest'>) {
  const group = useRef<THREE.Group>(null), bodies = useRef<THREE.InstancedMesh>(null), stickers = useRef<THREE.InstancedMesh>(null)
  const { clock, pointer } = usePose(paused, reduced)
  const { invalidate } = useThree()
  const controller = useMemo(() => new RubikController(), [])
  const lastRequest = useRef(0)
  const resources = useMemo(() => {
    const body = new RoundedBoxGeometry(.96, .96, .96, low ? 1 : 2, .075)
    const sticker = new RoundedBoxGeometry(.78, .78, .055, low ? 1 : 2, .025)
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: '#929292', metalness: .95, roughness: .19 })
    const stickerMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: .32, roughness: .18 })
    const faces: { cubie: number; normal: THREE.Vector3; q: THREE.Quaternion; color: THREE.Color }[] = []
    const normals = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]
    const colors = ['#eeeeee', '#101010', '#eeeeee', '#101010', '#101010', '#eeeeee']
    for (const cell of controller.cells) normals.forEach((normal, side) => {
      const n = new THREE.Vector3(normal[0], normal[1], normal[2])
      if (cell.home[0] * n.x + cell.home[1] * n.y + cell.home[2] * n.z !== 1) return
      faces.push({ cubie: cell.id, normal: n, q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n), color: new THREE.Color(colors[side]) })
    })
    return { body, sticker, bodyMaterial, stickerMaterial, faces }
  }, [low, controller])
  const helper = useMemo(() => ({ object: new THREE.Object3D(), matrix: new THREE.Matrix4(), rotation: new THREE.Quaternion(), axis: new THREE.Vector3(), poses: Array.from({ length: 26 }, () => ({ position: new THREE.Vector3(), q: new THREE.Quaternion() })) }), [])
  const update = () => {
    if (!bodies.current || !stickers.current) return
    const move = controller.active?.move
    helper.axis.set(move?.axis === 'x' ? 1 : 0, move?.axis === 'y' ? 1 : 0, move?.axis === 'z' ? 1 : 0)
    helper.rotation.setFromAxisAngle(helper.axis, controller.angle)
    for (const cell of controller.cells) {
      const pose = helper.poses[cell.id], m = cell.orientation
      pose.position.set(...cell.position)
      helper.matrix.set(m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1)
      pose.q.setFromRotationMatrix(helper.matrix)
      if (move && selected(cell, move)) { pose.position.applyQuaternion(helper.rotation); pose.q.premultiply(helper.rotation) }
      helper.object.position.copy(pose.position); helper.object.quaternion.copy(pose.q); helper.object.updateMatrix()
      bodies.current.setMatrixAt(cell.id, helper.object.matrix)
    }
    resources.faces.forEach((face, i) => {
      const pose = helper.poses[face.cubie]
      helper.object.position.copy(face.normal).multiplyScalar(.502).applyQuaternion(pose.q).add(pose.position)
      helper.object.quaternion.copy(pose.q).multiply(face.q); helper.object.updateMatrix()
      stickers.current!.setMatrixAt(i, helper.object.matrix)
    })
    bodies.current.instanceMatrix.needsUpdate = true; stickers.current.instanceMatrix.needsUpdate = true
  }
  useLayoutEffect(() => {
    while (lastRequest.current < turnRequest) { controller.request(); lastRequest.current++ }
    if (reduced) controller.finishPending()
    update(); invalidate()
  }, [turnRequest, reduced])
  useLayoutEffect(() => {
    bodies.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage); stickers.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    resources.faces.forEach((face, i) => stickers.current?.setColorAt(i, face.color))
    if (stickers.current?.instanceColor) stickers.current.instanceColor.needsUpdate = true
    update()
  }, [resources])
  useEffect(() => {
    const bodyMesh = bodies.current, stickerMesh = stickers.current
    return () => { bodyMesh?.dispose(); stickerMesh?.dispose(); resources.body.dispose(); resources.sticker.dispose(); resources.bodyMaterial.dispose(); resources.stickerMaterial.dispose() }
  }, [resources])
  useFrame((_, delta) => {
    const dt = Math.min(delta, .06)
    if (!paused && !reduced) { clock.current += dt; controller.advance(dt) }
    update()
    const t = clock.current
    if (group.current) {
      group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, .4 + (reduced ? 0 : pointer.current.y * .13 + Math.sin(t * .2) * .05), 3, dt)
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, -.55 + (reduced ? 0 : t * .095 + pointer.current.x * .22), 3, dt)
      group.current.position.y = reduced ? 0 : Math.sin(t * .4) * .08
    }
  })
  return <group ref={group} rotation={[.4, -.55, .04]}><instancedMesh ref={bodies} args={[resources.body, resources.bodyMaterial, 26]} dispose={null}/><instancedMesh ref={stickers} args={[resources.sticker, resources.stickerMaterial, 54]} dispose={null}/></group>
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
  return <Canvas camera={{ position: [0, .1, props.kind === 'cube' ? 7.8 : 6.2], fov: 38 }} frameloop="demand" dpr={props.low ? 1 : [1, 1.25]} gl={{ antialias: !props.low, alpha: true, powerPreference: 'low-power' }} aria-label={props.kind === 'cube' ? 'Вращающийся 3D-кубик Рубика' : 'Хромированная пространственная скульптура'}>
    <CanvasHealth onReady={props.onReady} onUnavailable={props.onUnavailable}/><MotionDriver paused={props.paused} reduced={props.reduced} low={props.low}/><Studio low={props.low} monochrome={props.kind === 'cube'}/>
    {props.kind === 'cube' ? <Rubik paused={props.paused} reduced={props.reduced} low={props.low} turnRequest={props.turnRequest}/> : <Signal paused={props.paused} reduced={props.reduced} low={props.low}/>}
  </Canvas>
}
