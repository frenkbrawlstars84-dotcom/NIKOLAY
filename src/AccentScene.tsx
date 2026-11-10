import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { AccentKind } from './AccentObject'
import CanvasHealth from './CanvasHealth'

type Props = { kind: AccentKind; reduced: boolean; paused: boolean; low: boolean; onReady: () => void; onUnavailable: () => void }
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
function Studio({ low }: { low: boolean }) {
  const { scene } = useThree()
  const environment = useMemo(() => {
    const size = low ? 64 : 128
    const faces = Array.from({ length: 6 }, (_, side) => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = size
      const paint = canvas.getContext('2d')!
      const gradient = paint.createLinearGradient(0, 0, size, size)
      gradient.addColorStop(0, side === 2 ? '#e4edfa' : '#1c293e'); gradient.addColorStop(.46, '#52677f'); gradient.addColorStop(.53, '#bacbdc'); gradient.addColorStop(.68, '#263851'); gradient.addColorStop(1, '#0b1220')
      paint.fillStyle = gradient; paint.fillRect(0, 0, size, size)
      paint.fillStyle = '#e7f0ff'; paint.globalAlpha = side % 2 ? .72 : .3; paint.fillRect(size * .15, size * .08, size * .13, size * .72)
      return canvas
    })
    const texture = new THREE.CubeTexture(faces); texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true
    return texture
  }, [low])
  useLayoutEffect(() => { const previous = scene.environment; scene.environment = environment; return () => { scene.environment = previous } }, [scene, environment])
  useEffect(() => () => environment.dispose(), [environment])
  return <><ambientLight intensity={.6}/><directionalLight position={[4, 6, 5]} intensity={3} color="#d6e6ff"/><directionalLight position={[-4, 1, 2]} intensity={1.1} color="#7f98c5"/><directionalLight position={[0, -3, -3]} intensity={.8} color="#c6a5b5"/></>
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
  const group = useRef<THREE.Group>(null), bodies = useRef<THREE.InstancedMesh>(null), stickers = useRef<THREE.InstancedMesh>(null)
  const { clock, pointer } = usePose(paused, reduced)
  const resources = useMemo(() => {
    const body = new RoundedBoxGeometry(.96, .96, .96, low ? 1 : 2, .075)
    const sticker = new RoundedBoxGeometry(.78, .78, .055, low ? 1 : 2, .025)
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: '#171e2b', metalness: .82, roughness: .23 })
    const stickerMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: .3, roughness: .28 })
    const cells: THREE.Vector3[] = [], faces: { center: THREE.Vector3; q: THREE.Quaternion; color: THREE.Color }[] = []
    const normals = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]
    const colors = ['#bdcbd9', '#b47678', '#e1e4e9', '#c7b480', '#6688b4', '#7eaa98']
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
      if (!x && !y && !z) continue
      const cell = new THREE.Vector3(x, y, z); cells.push(cell)
      normals.forEach((normal, side) => {
        const n = new THREE.Vector3(normal[0], normal[1], normal[2])
        if (cell.dot(n) !== 1) return
        faces.push({ center: cell.clone().addScaledVector(n, .502), q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n), color: new THREE.Color(colors[side]) })
      })
    }
    return { body, sticker, bodyMaterial, stickerMaterial, cells, faces }
  }, [low])
  const helper = useMemo(() => ({ object: new THREE.Object3D(), rotation: new THREE.Quaternion(), axis: new THREE.Vector3(0, 1, 0) }), [])
  const update = (angle: number) => {
    if (!bodies.current || !stickers.current) return
    helper.rotation.setFromAxisAngle(helper.axis, angle)
    resources.cells.forEach((cell, i) => {
      helper.object.position.copy(cell); helper.object.quaternion.identity()
      if (cell.y === 1) { helper.object.position.applyQuaternion(helper.rotation); helper.object.quaternion.copy(helper.rotation) }
      helper.object.updateMatrix(); bodies.current!.setMatrixAt(i, helper.object.matrix)
    })
    resources.faces.forEach((face, i) => {
      helper.object.position.copy(face.center); helper.object.quaternion.copy(face.q)
      if (face.center.y > .8) { helper.object.position.applyQuaternion(helper.rotation); helper.object.quaternion.premultiply(helper.rotation) }
      helper.object.updateMatrix(); stickers.current!.setMatrixAt(i, helper.object.matrix)
    })
    bodies.current.instanceMatrix.needsUpdate = true; stickers.current.instanceMatrix.needsUpdate = true
  }
  useLayoutEffect(() => {
    bodies.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    stickers.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    resources.faces.forEach((face, i) => stickers.current?.setColorAt(i, face.color))
    if (stickers.current?.instanceColor) stickers.current.instanceColor.needsUpdate = true
    update(0)
  }, [resources])
  useEffect(() => {
    const bodyMesh = bodies.current, stickerMesh = stickers.current
    return () => {
      bodyMesh?.dispose(); stickerMesh?.dispose()
      resources.body.dispose(); resources.sticker.dispose(); resources.bodyMaterial.dispose(); resources.stickerMaterial.dispose()
    }
  }, [resources])
  useFrame((_, delta) => {
    const dt = Math.min(delta, .06)
    if (!paused && !reduced) clock.current += dt
    const t = clock.current
    update(reduced ? 0 : (.5 - .5 * Math.cos(t * .42)) * Math.PI / 2)
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
    <CanvasHealth onReady={props.onReady} onUnavailable={props.onUnavailable}/><MotionDriver paused={props.paused} reduced={props.reduced} low={props.low}/><Studio low={props.low}/>
    {props.kind === 'cube' ? <Rubik paused={props.paused} reduced={props.reduced} low={props.low}/> : <Signal paused={props.paused} reduced={props.reduced} low={props.low}/>}
  </Canvas>
}
