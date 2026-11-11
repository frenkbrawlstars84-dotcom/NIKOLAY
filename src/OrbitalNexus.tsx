import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { ArtFrame } from './sceneTypes'
import StudioLighting from './StudioLighting'
export default function OrbitalNexus({reduced,paused,low,frame,anchor}:{reduced:boolean;paused:boolean;low:boolean;frame:RefObject<ArtFrame>;anchor:RefObject<HTMLDivElement|null>}){
 const root=useRef<THREE.Group>(null),clock=useRef(0),fresh=useRef(true),pointer=useRef(new THREE.Vector2()),target=useRef({x:0,y:0,at:-Infinity})
 const {camera,size,invalidate}=useThree()
 const resources=useMemo(()=>{
  const ribbon=(width:number)=>{
   const positions:number[]=[],uv:number[]=[],idx:number[]=[],steps=low?72:128
   const q=new THREE.Quaternion(),v=new THREE.Vector3()
   for(let lane=0;lane<5;lane++){
    q.setFromEuler(new THREE.Euler(lane*.63,.25+lane*.31,lane*.42))
    for(let i=0;i<=steps;i++)for(const side of [-1,1]){
     const a=i/steps*Math.PI*2,r=1.25+.19*Math.sin(a*3+lane*.8)+side*width
     v.set(Math.cos(a)*r,Math.sin(a)*r,.24*Math.sin(a*2+lane)+side*.08*Math.cos(a*3)).applyQuaternion(q)
     positions.push(v.x,v.y,v.z);uv.push(i/steps,(side+1)/2)
     if(side===-1&&i<steps){const n=lane*(steps+1)*2+i*2;idx.push(n,n+1,n+2,n+1,n+3,n+2)}
    }
   }
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g
  }
  const shell=ribbon(.15),edge=ribbon(.008)
  const metal=low?new THREE.MeshLambertMaterial({color:'#b7c5d8',side:THREE.DoubleSide}):new THREE.MeshStandardMaterial({color:'#b7c7df',metalness:1,roughness:.2,side:THREE.DoubleSide,envMapIntensity:1.65})
  const glow=new THREE.ShaderMaterial({vertexShader:'// HERO_ORBITAL_NEXUS\nvarying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float uTime;varying vec2 vUv;void main(){float light=.6+.4*sin(vUv.x*18.-uTime*.55);gl_FragColor=vec4(.52,.73,1.,light*.8);}',uniforms:{uTime:{value:0}},transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending})
  const pts=new Float32Array((low?120:320)*3)
  for(let i=0;i<pts.length/3;i++){const a=i*2.39996,r=1.65+(i*.618%1)*.9;pts.set([Math.cos(a)*r,Math.sin(a)*r,Math.sin(i*1.7)*1.6],i*3)}
  const particles=new THREE.BufferGeometry();particles.setAttribute('position',new THREE.BufferAttribute(pts,3))
  return {shell,edge,metal,glow,particles}
 },[low])
 useEffect(()=>()=>{resources.shell.dispose();resources.edge.dispose();resources.metal.dispose();resources.glow.dispose();resources.particles.dispose()},[resources])
 useEffect(()=>{fresh.current=true;invalidate();if(paused||reduced)return;const move=(e:PointerEvent)=>{if(e.pointerType==='touch'||!anchor.current)return;const r=anchor.current.getBoundingClientRect();target.current={x:THREE.MathUtils.clamp((e.clientX-r.left)/r.width*2-1,-1,1),y:THREE.MathUtils.clamp(1-(e.clientY-r.top)/r.height*2,-1,1),at:performance.now()}};window.addEventListener('pointermove',move,{passive:true});return()=>window.removeEventListener('pointermove',move)},[paused,reduced,anchor,invalidate])
 useFrame((_,delta)=>{
  const dt=fresh.current?0:delta;fresh.current=false;if(!paused&&!reduced)clock.current+=dt
  const activity=reduced?0:Math.exp(-Math.max(0,performance.now()-target.current.at-350)*.002)
  pointer.current.x=THREE.MathUtils.damp(pointer.current.x,target.current.x*activity,4,dt);pointer.current.y=THREE.MathUtils.damp(pointer.current.y,target.current.y*activity,4,dt)
  const h=2*7.4*Math.tan(42*Math.PI/360),w=h*size.width/size.height
  if(root.current){root.current.position.set(frame.current.x*w,frame.current.y*h+Math.sin(clock.current*.35)*.035,0);root.current.scale.setScalar(Math.min(frame.current.width*w/4.9,frame.current.height*h/4.9));root.current.rotation.set(.28+pointer.current.y*.07,clock.current*.055+pointer.current.x*.1,-.12+Math.sin(clock.current*.12)*.06)}
  resources.glow.uniforms.uTime.value=clock.current;camera.position.set(pointer.current.x*.025,pointer.current.y*.02,7.4)
 })
 return <><StudioLighting low={low} monochrome={false}/><group ref={root}>
  <mesh geometry={resources.shell} material={resources.metal}/><mesh geometry={resources.edge} material={resources.glow}/>
  <mesh><icosahedronGeometry args={[.58,1]}/><meshStandardMaterial color="#344a66" metalness={.85} roughness={.19} emissive="#0c192b" emissiveIntensity={.7}/></mesh>
  <points geometry={resources.particles}><pointsMaterial color="#c7d8f5" size={.012} transparent opacity={.5} depthWrite={false}/></points>
 </group></>
}
