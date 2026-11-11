import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { ArtFrame } from './sceneTypes'
import type { ObjectInteraction } from './objectInteraction'
import StudioLighting from './StudioLighting'
import useObjectMotion from './useObjectMotion'
import { createOrbitalRibbon } from './orbitalGeometry'
import { portalJourney, smooth } from './portalJourney'

export default function OrbitalNexus({reduced,paused,low,frame,interaction:p,progress}:{reduced:boolean;paused:boolean;low:boolean;frame:RefObject<ArtFrame>;interaction:ObjectInteraction;progress:RefObject<number>}){
 const root=useRef<THREE.Group>(null),shell=useRef<THREE.Mesh>(null),edge=useRef<THREE.Mesh>(null),core=useRef<THREE.Mesh>(null)
 const {camera,size}=useThree()
 useObjectMotion(p,paused,reduced)
 const resources=useMemo(()=>{
  const shell=createOrbitalRibbon(low,.15),edge=createOrbitalRibbon(low,.008)
  const metal=low?new THREE.MeshLambertMaterial({color:'#b7c5d8',side:THREE.DoubleSide}):new THREE.MeshStandardMaterial({color:'#b7c7df',metalness:1,roughness:.2,side:THREE.DoubleSide,envMapIntensity:1.65})
  const glow=new THREE.ShaderMaterial({vertexShader:`// HERO_ORBITAL_NEXUS
    varying vec2 vUv;
    #include <common>
    #include <morphtarget_pars_vertex>
    void main(){vUv=uv;
      #include <begin_vertex>
      #include <morphtarget_vertex>
      gl_Position=projectionMatrix*modelViewMatrix*vec4(transformed,1.);
    }`,fragmentShader:'uniform float uTime;uniform float uReveal;uniform float uHover;varying vec2 vUv;void main(){float light=.6+.4*sin(vUv.x*18.-uTime*.55);gl_FragColor=vec4(vec3(.52,.73,1.)*(1.+uReveal*.4+uHover*.17),light*(.8+uHover*.16));}',uniforms:{uTime:{value:0},uReveal:{value:0},uHover:{value:0}},transparent:true,depthWrite:false,forceSinglePass:true,side:THREE.DoubleSide,blending:THREE.AdditiveBlending})
  const pts=new Float32Array((low?120:320)*3)
  for(let i=0;i<pts.length/3;i++){const a=i*2.39996,r=1.65+(i*.618%1)*.9;pts.set([Math.cos(a)*r,Math.sin(a)*r,Math.sin(i*1.7)*1.6],i*3)}
  const particles=new THREE.BufferGeometry();particles.setAttribute('position',new THREE.BufferAttribute(pts,3))
  return {shell,edge,metal,glow,particles}
 },[low])
 useEffect(()=>()=>{resources.shell.dispose();resources.edge.dispose();resources.metal.dispose();resources.glow.dispose();resources.particles.dispose()},[resources])
 useFrame(()=>{
  const scroll=reduced?0:progress.current,j=portalJourney(scroll),travel=smooth(.12,.65,scroll),amount=reduced?0:p.value*(1-travel),hover=reduced?0:p.hover*(1-travel)
  for(const object of [shell.current,edge.current])if(object?.morphTargetInfluences){object.morphTargetInfluences[0]=amount+Math.sin(p.time*1.6)*hover*.012;object.morphTargetInfluences[1]=travel}
  const h=2*7.4*Math.tan(42*Math.PI/360),w=h*size.width/size.height
  if(root.current){
   root.current.position.set(frame.current.x*w*(1-j.center),frame.current.y*h*(1-j.center)+Math.sin(p.time*.35)*.035*(1-j.center),0)
   root.current.scale.setScalar(THREE.MathUtils.lerp(Math.min(frame.current.width*w/4.9,frame.current.height*h/4.9),1,j.center))
   root.current.rotation.set((.28+p.pitch+p.y*.07)*(1-j.center),(p.time*.055+p.yaw+p.x*.1)*(1-j.center),(-.12+Math.sin(p.time*.12)*.06)*(1-j.center))
  }
  if(core.current){core.current.scale.setScalar(1-smooth(.08,.3,scroll));core.current.visible=scroll<.3;core.current.rotation.y=p.time*.06+amount*.18}
  resources.glow.uniforms.uTime.value=p.time;resources.glow.uniforms.uReveal.value=amount;resources.glow.uniforms.uHover.value=hover
  camera.position.set(j.x+p.x*.025*(1-j.center),j.y+p.y*.02*(1-j.center),j.z)
 })
 return <><StudioLighting low={low} monochrome={false}/><group ref={root}>
  <mesh ref={shell} args={[resources.shell,resources.metal]}/><mesh ref={edge} args={[resources.edge,resources.glow]}/>
  <mesh ref={core}><icosahedronGeometry args={[.58,1]}/><meshStandardMaterial color="#344a66" metalness={.85} roughness={.19} emissive="#0c192b" emissiveIntensity={.7}/></mesh>
  <points geometry={resources.particles}><pointsMaterial color="#c7d8f5" size={.012} transparent opacity={.5} depthWrite={false}/></points>
 </group></>
}
