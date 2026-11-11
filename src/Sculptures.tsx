import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createChromeKnot, createGlassShards } from './sculptureGeometry'
import type { ObjectInteraction } from './objectInteraction'
import useObjectMotion from './useObjectMotion'

type Props = { paused: boolean; reduced: boolean; low: boolean; interaction: ObjectInteraction; simple?:boolean }
export function ChromeKnot({interaction:p,...props}: Props) {
  const group=useRef<THREE.Group>(null),mesh=useRef<THREE.Mesh>(null),material=useRef<THREE.MeshStandardMaterial>(null)
  useObjectMotion(p,props.paused,props.reduced)
  const geometry=useMemo(()=>createChromeKnot(props.low),[props.low])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  useFrame((_,delta)=>{
    const amount=props.reduced?0:p.value,hover=props.reduced?0:p.hover,t=p.time,blend=props.reduced?1:1-Math.exp(-Math.min(delta,.1)*7)
    if(mesh.current?.morphTargetInfluences)mesh.current.morphTargetInfluences[0]=amount+Math.sin(t*1.8)*hover*.018*(1-amount)
    if(material.current)material.current.emissiveIntensity=.012+hover*.025+amount*.035
    if(group.current){
      group.current.rotation.x=THREE.MathUtils.lerp(group.current.rotation.x,.35+p.pitch+p.y*.1+Math.sin(t*.13)*.16,blend)
      group.current.rotation.y=THREE.MathUtils.lerp(group.current.rotation.y,t*.16+p.yaw+p.x*.14,blend)
      group.current.rotation.z=t*.035
    }
  })
  return <group ref={group} rotation={[.35,0,0]}><mesh ref={mesh} args={[geometry]}><meshStandardMaterial ref={material} color="#d9d9d9" emissive="#a5c1e6" metalness={1} roughness={.13} envMapIntensity={1.65}/></mesh></group>
}
export function GlassPolyhedron({interaction:p,...props}: Props) {
  const group=useRef<THREE.Group>(null),mesh=useRef<THREE.Mesh>(null),outline=useRef<THREE.LineSegments>(null),core=useRef<THREE.LineSegments>(null)
  useObjectMotion(p,props.paused,props.reduced)
  const {geometry,edges}=useMemo(()=>createGlassShards(props.low),[props.low])
  const fracture=useMemo(()=>({value:0}),[])
  const glassShader=(shader:Parameters<THREE.Material['onBeforeCompile']>[0])=>{
          shader.uniforms.uFracture=fracture
          shader.vertexShader='attribute float aInterior;varying float vInterior;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvInterior=aInterior;')
          shader.fragmentShader='uniform float uFracture;varying float vInterior;\n'+shader.fragmentShader.replace('#include <alphamap_fragment>','#include <alphamap_fragment>\nif(vInterior>.5){if(uFracture<.003)discard;diffuseColor.a*=smoothstep(.003,.2,uFracture);}')
  }
  const opticalCore=useMemo(()=>{const base=new THREE.OctahedronGeometry(.55);const lines=new THREE.EdgesGeometry(base);base.dispose();return lines},[])
  useEffect(()=>()=>{geometry.dispose();edges.dispose()},[geometry,edges])
  useEffect(()=>()=>opticalCore.dispose(),[opticalCore])
  useFrame((_,delta)=>{
    const amount=props.reduced?0:p.value,t=p.time,blend=props.reduced?1:1-Math.exp(-Math.min(delta,.1)*5)
    fracture.value=amount
    for(const object of [mesh.current,outline.current])if(object?.morphTargetInfluences)object.morphTargetInfluences[0]=amount
    if(core.current)core.current.rotation.y=t*.09+amount*.35
    if(group.current){
      group.current.rotation.x=THREE.MathUtils.lerp(group.current.rotation.x,.4+p.pitch+p.y*.1+Math.sin(t*.16)*.09,blend)
      group.current.rotation.y=THREE.MathUtils.lerp(group.current.rotation.y,p.yaw+t*.12+p.x*.15,blend)
      group.current.rotation.z=Math.sin(t*.13)*.09
      group.current.position.y=props.reduced?0:Math.sin(t*.5)*.06
    }
  })
  return <>
    <group position={[0,0,-1.4]} rotation={[0,0,-.35]}>{[-.8,0,.8].map((x,i)=><mesh key={x} position={[x,0,0]} rotation={[0,0,i*.3]}><boxGeometry args={[.018,3.5,.018]}/><meshBasicMaterial color="#b8b8b8"/></mesh>)}</group>
    <group ref={group} rotation={[.4,0,0]}>
      <lineSegments ref={core} geometry={opticalCore} rotation={[.3,.4,.15]}><lineBasicMaterial color="#b0c2da"/></lineSegments>
      <mesh ref={mesh} args={[geometry]}>{props.simple?<meshStandardMaterial color="#c8d9ed" metalness={.18} roughness={.12} transparent opacity={.24} envMapIntensity={1.4} side={THREE.FrontSide} onBeforeCompile={glassShader} customProgramCacheKey={()=>'NIKOLAY_GLASS_SHARDS_LITE'}/>:<meshPhysicalMaterial color="#ffffff" metalness={0} roughness={props.low?.045:.015} transmission={1} transparent opacity={.52} thickness={props.low?.18:.3} ior={1.45} clearcoat={.7} clearcoatRoughness={.035} attenuationColor="#ffffff" attenuationDistance={10} envMapIntensity={1.2} side={THREE.FrontSide}
        onBeforeCompile={glassShader} customProgramCacheKey={()=>'NIKOLAY_GLASS_SHARDS'}/>}</mesh>
      <lineSegments ref={outline} args={[edges]}><lineBasicMaterial color="#d9e6f7" transparent opacity={.19}/></lineSegments>
    </group>
  </>
}
