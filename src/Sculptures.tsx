import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { createChromeKnot, createGlassCrystal } from './sculptureGeometry'

type Props = { paused: boolean; reduced: boolean; low: boolean }
function useSculpturePose(paused: boolean, reduced: boolean) {
  const { gl, invalidate } = useThree()
  const pose = useRef({ time:0, x:0, y:0, yaw:0, pitch:0, scroll:.5 })
  useEffect(() => {
    const canvas=gl.domElement
    let drag: { id:number; x:number; y:number } | null=null
    const move=(e:PointerEvent) => {
      const r=canvas.getBoundingClientRect()
      pose.current.x=(e.clientX-r.left)/r.width-.5; pose.current.y=(e.clientY-r.top)/r.height-.5
      if(drag&&drag.id===e.pointerId){pose.current.yaw+=(e.clientX-drag.x)*.008;pose.current.pitch+=(e.clientY-drag.y)*.008;drag.x=e.clientX;drag.y=e.clientY}
      invalidate()
    }
    const down=(e:PointerEvent) => {if(e.pointerType==='touch')return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing'}
    const up=(e:PointerEvent)=>{if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);drag=null;canvas.style.cursor='grab'}
    const key=(e:KeyboardEvent)=>{
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return
      e.preventDefault()
      if(e.key==='Home'){pose.current.yaw=0;pose.current.pitch=0}
      else if(e.key==='ArrowLeft'||e.key==='ArrowRight')pose.current.yaw+=e.key==='ArrowLeft'?-.2:.2
      else pose.current.pitch+=e.key==='ArrowUp'?-.2:.2
      invalidate()
    }
    const scroll=()=>{if(reduced)return;const r=canvas.getBoundingClientRect();pose.current.scroll=THREE.MathUtils.clamp((innerHeight-r.top)/(innerHeight+r.height),0,1)}
    canvas.tabIndex=0;canvas.style.cursor='grab';canvas.style.touchAction='pan-y'
    canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('keydown',key)
    if(!paused&&!reduced)window.addEventListener('scroll',scroll,{passive:true});scroll()
    return()=>{canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('keydown',key);window.removeEventListener('scroll',scroll)}
  },[gl,invalidate,paused,reduced])
  return pose
}
export function ChromeKnot(props: Props) {
  const group=useRef<THREE.Group>(null),pose=useSculpturePose(props.paused,props.reduced)
  const geometry=useMemo(()=>createChromeKnot(props.low),[props.low])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  useFrame((_,delta)=>{
    const p=pose.current,dt=Math.min(delta,.05)
    if(!props.paused&&!props.reduced)p.time+=dt
    if(group.current){
      const damping=props.reduced?1:1-Math.exp(-dt*7)
      group.current.rotation.x=THREE.MathUtils.lerp(group.current.rotation.x,.35+p.pitch+p.y*.22+Math.sin(p.time*.13)*.22,damping)
      group.current.rotation.y=THREE.MathUtils.lerp(group.current.rotation.y,p.time*.16+p.yaw+p.x*.28,damping)
      group.current.rotation.z=props.reduced?0:p.time*.035
    }
  })
  return <group ref={group} rotation={[.35,0,0]}><mesh geometry={geometry}><meshStandardMaterial color="#d9d9d9" metalness={1} roughness={.13} envMapIntensity={1.65}/></mesh></group>
}
export function GlassPolyhedron(props: Props) {
  const group=useRef<THREE.Group>(null),pose=useSculpturePose(props.paused,props.reduced)
  const geometry=useMemo(()=>createGlassCrystal(props.low),[props.low])
  const edges=useMemo(()=>new THREE.EdgesGeometry(geometry,28),[geometry])
  const opticalCore=useMemo(()=>{const base=new THREE.OctahedronGeometry(.55);const lines=new THREE.EdgesGeometry(base);base.dispose();return lines},[])
  useEffect(()=>()=>{geometry.dispose();edges.dispose()},[geometry,edges])
  useEffect(()=>()=>opticalCore.dispose(),[opticalCore])
  useFrame((_,delta)=>{
    const p=pose.current,dt=Math.min(delta,.05)
    if(!props.paused&&!props.reduced)p.time+=dt
    if(group.current){
      const damping=props.reduced?1:1-Math.exp(-dt*5)
      group.current.rotation.x=THREE.MathUtils.lerp(group.current.rotation.x,.2+p.pitch+p.scroll*.55+p.y*.15+Math.sin(p.time*.16)*.11,damping)
      group.current.rotation.y=THREE.MathUtils.lerp(group.current.rotation.y,p.yaw+p.time*.12+p.x*.25,damping)
      group.current.rotation.z=Math.sin(p.time*.13)*.09
      group.current.position.y=props.reduced?0:Math.sin(p.time*.5)*.09
    }
  })
  return <>
    <group position={[0,0,-1.4]} rotation={[0,0,-.35]}>{[-.8,0,.8].map((x,i)=><mesh key={x} position={[x,0,0]} rotation={[0,0,i*.3]}><boxGeometry args={[.018,3.5,.018]}/><meshBasicMaterial color="#b8b8b8"/></mesh>)}</group>
    <group ref={group} rotation={[.4,0,0]}>
      <lineSegments geometry={opticalCore} rotation={[.3,.4,.15]}><lineBasicMaterial color="#b0b0b0"/></lineSegments>
      <mesh geometry={geometry}><meshPhysicalMaterial color="#ffffff" metalness={0} roughness={props.low ? .06 : .015} transmission={1} transparent opacity={.6} thickness={props.low ? .3 : .65} ior={1.45} clearcoat={.7} clearcoatRoughness={.035} attenuationColor="#ffffff" attenuationDistance={10} envMapIntensity={1.15} side={THREE.FrontSide}/></mesh>
      <lineSegments geometry={edges}><lineBasicMaterial color="#d9d9d9" transparent opacity={.26}/></lineSegments>
    </group>
  </>
}
