import { Component, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { AdaptiveDpr } from '@react-three/drei'
import * as THREE from 'three'

const vertex = `uniform float uTime; uniform float uProgress; uniform float uReveal; attribute float aStrand; varying float vLight; void main(){vec3 p=position; float t=uTime*.16; float spread=smoothstep(.05,.85,uProgress); p.xy*=1.+.08*sin(p.z*1.7+t); p.x+=sin(p.y*1.3+t)*.1; p+=normalize(position+vec3(.01))*spread*(.4+sin(aStrand*15.)*.3); p.z+=sin(aStrand*22.+p.y*2.+t)*spread*1.5; vLight=.34+.66*pow(.5+.5*sin(aStrand*28.+p.z*1.4+t),2.); vec4 mv=modelViewMatrix*vec4(p*uReveal,1.); gl_Position=projectionMatrix*mv; }`
const fragment = `uniform float uOpacity; varying float vLight; void main(){ gl_FragColor=vec4(vec3(.76,.80,.85)*vLight,uOpacity*(.35+.65*vLight)); }`
function Sculpture({ progress, reduced, paused, low }: {progress: React.RefObject<number>; reduced: boolean; paused: boolean; low: boolean}) {
 const object=useRef<THREE.Group>(null)
 const { invalidate, camera }=useThree()
 const pointer=useRef({x:0,y:0})
 useEffect(()=>{if(reduced)return;const f=(e:PointerEvent)=>{pointer.current={x:e.clientX/innerWidth*2-1,y:1-e.clientY/innerHeight*2}};window.addEventListener('pointermove',f,{passive:true});return()=>window.removeEventListener('pointermove',f)},[reduced])
 const clock=useRef(0)
 const material=useMemo(()=>new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0},uProgress:{value:0},uReveal:{value:reduced?1:0},uOpacity:{value:.82}}}),[reduced])
 const geometry=useMemo(()=>{const strands=low?52:100, segments=low?120:200;const points:number[]=[], ids:number[]=[];for(let j=0;j<strands;j++){const f=j/strands, a=f*Math.PI*2;for(let k=0;k<segments;k++){for(const n of [k,k+1]){const t=n/segments*Math.PI*2;const radius=1.55+.46*Math.cos(3*t+a);const x=radius*Math.cos(t);const y=radius*Math.sin(t);const z=.57*Math.sin(3*t+a)+.17*Math.cos(a);points.push(x,y,z);ids.push(f)}}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setAttribute('aStrand',new THREE.Float32BufferAttribute(ids,1));return g},[low])
 useEffect(()=>()=>{geometry.dispose();material.dispose()},[geometry,material])
 useEffect(()=>{invalidate()},[reduced,paused,invalidate])
 useFrame((_,delta)=>{if(!paused&&!reduced)clock.current+=Math.min(delta,.04);const p=progress.current;material.uniforms.uTime.value=clock.current;material.uniforms.uProgress.value=reduced?0:p;material.uniforms.uReveal.value=THREE.MathUtils.damp(material.uniforms.uReveal.value,1,2.4,delta);if(object.current){object.current.rotation.x=THREE.MathUtils.damp(object.current.rotation.x,.3+(reduced?0:pointer.current.y*.16+p*.7),3,delta);object.current.rotation.y=THREE.MathUtils.damp(object.current.rotation.y,-.4+(reduced?0:pointer.current.x*.2+clock.current*.07+p*1.2),3,delta);object.current.rotation.z=-.35;object.current.position.x=THREE.MathUtils.damp(object.current.position.x,reduced?0:p*-.6,3,delta)}camera.position.z=THREE.MathUtils.damp(camera.position.z,6.1-(reduced?0:p*1.6),3,delta)})
 return <group ref={object}><lineSegments geometry={geometry} material={material}/><lineSegments geometry={geometry} scale={1.006}><primitive object={material} attach="material"/></lineSegments></group>
}
class Boundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true}}render(){return this.state.failed?this.props.fallback:this.props.children}}
function Fallback(){return <div className="scene-fallback" aria-label="Статичная графическая версия скульптуры"><svg viewBox="0 0 600 600" fill="none">{Array.from({length:45},(_,i)=><ellipse key={i} cx="300" cy="300" rx={90+i*3} ry={180-i*2.4} transform={`rotate(${i*4} 300 300)`} stroke="#b7bdc5" strokeOpacity=".35" strokeWidth=".65"/>)}</svg></div>}
export default function Scene({progress,reduced,paused}:{progress:React.RefObject<number>;reduced:boolean;paused:boolean}){
 const [supported]=useState(()=>{try{const c=document.createElement('canvas');const gl=c.getContext('webgl2');if(!gl)return false;gl.getExtension('WEBGL_lose_context')?.loseContext();return true}catch{return false}})
 const [visible,setVisible]=useState(!document.hidden)
 const host=useRef<HTMLDivElement>(null)
 const [inView,setInView]=useState(true)
 useEffect(()=>{const observer=new IntersectionObserver(([entry])=>setInView(entry.isIntersecting));if(host.current)observer.observe(host.current);return()=>observer.disconnect()},[])
 const low=useMemo(()=>matchMedia('(max-width: 768px)').matches||navigator.hardwareConcurrency<=4,[])
 useEffect(()=>{const f=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',f);return()=>document.removeEventListener('visibilitychange',f)},[])
 return <div ref={host} className="scene-host"><Boundary fallback={<Fallback/>}>{supported?<Canvas aria-label="Интерактивная процедурная скульптура из серебристых линий" camera={{position:[0,0,6.1],fov:42}} dpr={low?1:[1,1.5]} frameloop={!visible||!inView||paused||reduced?'demand':'always'} gl={{antialias:!low,alpha:true,powerPreference:'low-power'}}><Sculpture progress={progress} reduced={reduced} paused={paused||!visible||!inView} low={low}/><AdaptiveDpr pixelated/></Canvas>:<Fallback/>}</Boundary></div>
}
