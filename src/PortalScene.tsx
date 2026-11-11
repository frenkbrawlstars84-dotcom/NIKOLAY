import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import BlackHole from './BlackHole'
import AdaptiveQuality from './AdaptiveQuality'
import CanvasHealth from './CanvasHealth'
import { ARRIVAL_TIME, introJourney } from './introJourney'
import { spiralGalaxy } from './galaxyGeometry'

type Props={onReady:()=>void;onUnavailable:()=>void;onArrival:()=>void;host:RefObject<HTMLElement|null>}
const pointVertex=`
  attribute vec3 color;
  varying vec3 vColor;
  varying float vFade;
  uniform float uOpacity;
  uniform float uPixelRatio;
  void main(){
    vec4 view=modelViewMatrix*vec4(position,1.);
    vColor=color;vFade=uOpacity*smoothstep(.5,5.,-view.z)*(1.-smoothstep(170.,240.,-view.z));
    gl_Position=projectionMatrix*view;
    gl_PointSize=clamp(48.*uPixelRatio/max(1.,-view.z),.8,3.5);
  }
`
const pointFragment=`varying vec3 vColor;varying float vFade;void main(){float r=length(gl_PointCoord-.5);gl_FragColor=vec4(vColor,exp(-r*r*16.)*vFade);}`
const trailVertex=`
  attribute float aTip;
  uniform float uSpeed;
  uniform float uOpacity;
  varying float vAlpha;
  void main(){
    vec3 p=position;p.z+=aTip*mix(.015,3.8,uSpeed);
    vec4 v=modelViewMatrix*vec4(p,1.);
    vAlpha=uOpacity*uSpeed*(.25+.75*aTip)*smoothstep(.7,4.,-v.z)*(1.-smoothstep(140.,220.,-v.z));
    gl_Position=projectionMatrix*v;
  }
`
const trailFragment=`varying float vAlpha;void main(){gl_FragColor=vec4(.66,.78,1.,vAlpha*.48);}`
const nebulaFragment=`
  varying vec2 vUv;uniform float uOpacity;uniform float uTime;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
  void main(){
    vec2 p=(vUv-.5)*2.;float falloff=pow(max(0.,1.-dot(p,p)),2.);
    vec2 n=p*3.+vec2(uTime*.018,0.);
    float cloud=noise(n)*.6+noise(n*2.1)*.28+noise(n*4.2)*.12;
    float wisps=pow(max(0.,cloud-.2),2.)*falloff;
    gl_FragColor=vec4(mix(vec3(.3,.37,.48),vec3(.64,.69,.76),cloud),wisps*uOpacity*.42);
  }
`
function Galaxy({ seed, position, rotation, scale, opacity, low }: { seed:number;position:[number,number,number];rotation:[number,number,number];scale:number;opacity:RefObject<number>;low:boolean }) {
  const data=useMemo(()=>spiralGalaxy(seed,low?1800:4200),[seed,low])
  const uniforms=useMemo(()=>({uOpacity:{value:0},uPixelRatio:{value:Math.min(devicePixelRatio,1.25)}}),[])
  const group=useRef<THREE.Points>(null),material=useRef<THREE.ShaderMaterial>(null),core=useRef<THREE.ShaderMaterial>(null)
  useFrame((_,delta)=>{if(material.current)material.current.uniforms.uOpacity.value=opacity.current*.78;if(core.current)core.current.uniforms.uOpacity.value=opacity.current*.85;if(group.current)group.current.rotation.z+=Math.min(delta,.1)*.018})
  return <group position={position} rotation={rotation} scale={scale}><points ref={group}>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[data.positions,3]}/><bufferAttribute attach="attributes-color" args={[data.colors,3]}/></bufferGeometry>
    <shaderMaterial ref={material} vertexShader={pointVertex} fragmentShader={pointFragment} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending}/>
  </points><mesh scale={[2.6,2.6,1]}><planeGeometry/><shaderMaterial ref={core} uniforms={uniforms} vertexShader="varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}" fragmentShader="varying vec2 vUv;uniform float uOpacity;void main(){vec2 p=(vUv-.5)*2.;float light=exp(-dot(p,p)*12.)*.8+exp(-dot(p,p)*4.)*.1;gl_FragColor=vec4(.82,.88,1.,light*uOpacity);}" transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide}/></mesh></group>
}
function Nebula({z,index,opacity,clock}:{z:number;index:number;opacity:RefObject<number>;clock:RefObject<number>}) {
  const material=useRef<THREE.ShaderMaterial>(null)
  const uniforms=useMemo(()=>({uOpacity:{value:0},uTime:{value:0}}),[])
  useFrame(()=>{if(material.current){material.current.uniforms.uOpacity.value=opacity.current;material.current.uniforms.uTime.value=clock.current}})
  return <mesh position={[index%2?12:-10,index%2?-8:5,z]} rotation={[0,0,index*.7]} scale={[75,50,1]}><planeGeometry/><shaderMaterial ref={material} vertexShader="varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}" fragmentShader={nebulaFragment} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide}/></mesh>
}
function UniverseFlight({opacity,clock,speed,low}:{opacity:RefObject<number>;clock:RefObject<number>;speed:RefObject<number>;low:boolean}) {
  const data=useMemo(()=>{
    let seed=9173
    const random=()=>((seed=seed*16807%2147483647)-1)/2147483646
    const count=low?650:1400,positions=new Float32Array(count*3),colors=new Float32Array(count*3),trails=new Float32Array(count*6),tips=new Float32Array(count*2)
    for(let i=0;i<count;i++){
      const angle=random()*Math.PI*2,r=.7+Math.pow(random(),.6)*38,z=12-random()*230,x=Math.cos(angle)*r,y=Math.sin(angle)*r
      positions.set([x,y,z],i*3);colors.set([.65+random()*.3,.72+random()*.25,1],i*3)
      trails.set([x,y,z,x,y,z],i*6);tips.set([0,1],i*2)
    }
    return {positions,colors,trails,tips}
  },[low])
  const stars=useMemo(()=>({uOpacity:{value:0},uPixelRatio:{value:Math.min(devicePixelRatio,1.25)}}),[])
  const trails=useMemo(()=>({uOpacity:{value:0},uSpeed:{value:0}}),[])
  const world=useRef<THREE.Group>(null)
  const starMaterial=useRef<THREE.ShaderMaterial>(null),trailMaterial=useRef<THREE.ShaderMaterial>(null)
  useFrame(()=>{if(world.current)world.current.visible=opacity.current>.001;if(starMaterial.current)starMaterial.current.uniforms.uOpacity.value=opacity.current*.85;if(trailMaterial.current){trailMaterial.current.uniforms.uOpacity.value=opacity.current;trailMaterial.current.uniforms.uSpeed.value=speed.current}})
  return <group ref={world} visible={false}>
    <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[data.positions,3]}/><bufferAttribute attach="attributes-color" args={[data.colors,3]}/></bufferGeometry><shaderMaterial ref={starMaterial} vertexShader={pointVertex} fragmentShader={pointFragment} uniforms={stars} transparent depthWrite={false} blending={THREE.AdditiveBlending}/></points>
    <lineSegments frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[data.trails,3]}/><bufferAttribute attach="attributes-aTip" args={[data.tips,1]}/></bufferGeometry><shaderMaterial ref={trailMaterial} vertexShader={trailVertex} fragmentShader={trailFragment} uniforms={trails} transparent depthWrite={false} blending={THREE.AdditiveBlending}/></lineSegments>
    {[-35,-85,-145].map((z,i)=><Nebula key={z} z={z} index={i} opacity={opacity} clock={clock}/>)}
    <Galaxy seed={94} position={[-8,4,-23]} rotation={[.55,.1,-.35]} scale={1.2} opacity={opacity} low={low}/>
    <Galaxy seed={287} position={[12,-5,-48]} rotation={[-.6,.4,.7]} scale={1.8} opacity={opacity} low={low}/>
    <Galaxy seed={951} position={[-17,-7,-76]} rotation={[.2,.3,-.6]} scale={2.3} opacity={opacity} low={low}/>
    <Galaxy seed={442} position={[9,9,-105]} rotation={[-.4,-.2,.2]} scale={1.8} opacity={opacity} low={low}/>
    <Galaxy seed={319} position={[-10,5,-160]} rotation={[.55,.2,-.8]} scale={2.6} opacity={opacity} low={low}/>
  </group>
}
function Flight({onReady,onUnavailable,onArrival,host,low,simple}:{low:boolean;simple:boolean}&Props) {
  const elapsed=useRef(0),holeOpacity=useRef(1),flightOpacity=useRef(0),speed=useRef(0),arrived=useRef(false),stage=useRef('')
  useFrame(({camera},delta)=>{
    if(document.hidden)return
    elapsed.current+=delta
    const journey=introJourney(elapsed.current)
    camera.position.set(Math.sin(elapsed.current*.4)*.12,Math.sin(elapsed.current*.3)*.08,journey.z)
    holeOpacity.current=journey.holeOpacity;flightOpacity.current=journey.flightOpacity;speed.current=journey.streak
    if(stage.current!==journey.stage){stage.current=journey.stage;if(host.current)host.current.dataset.introStage=journey.stage}
    if(elapsed.current>=ARRIVAL_TIME&&!arrived.current){arrived.current=true;onArrival()}
  },-1)
  return <><CanvasHealth onReady={onReady} onUnavailable={onUnavailable}/><UniverseFlight opacity={flightOpacity} clock={elapsed} speed={speed} low={low}/><BlackHole simple={simple} opacity={holeOpacity} clock={elapsed} low={low} onUnavailable={onUnavailable}/></>
}
export default function PortalScene(props:Props) {
  const [visible,setVisible]=useState(!document.hidden)
  const [software,setSoftware]=useState(false)
  const low=software||innerWidth<=700||navigator.hardwareConcurrency<=4
  useEffect(()=>{const change=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',change);return()=>document.removeEventListener('visibilitychange',change)},[])
  return <Canvas onCreated={({gl})=>{const context=gl.getContext(),debug=context.getExtension('WEBGL_debug_renderer_info');setSoftware(/swiftshader|llvmpipe|softpipe|software/i.test(String(context.getParameter(debug?debug.UNMASKED_RENDERER_WEBGL:context.RENDERER))))}} frameloop={visible?'always':'demand'} camera={{position:[0,0,19],fov:42,near:.1,far:260}} dpr={[1,low?1:Math.min(devicePixelRatio,1.25)]} gl={{antialias:true,alpha:true,powerPreference:'high-performance'}}><AdaptiveQuality low={low} active={visible}><Flight {...props} low={low} simple={false}/></AdaptiveQuality></Canvas>
}
