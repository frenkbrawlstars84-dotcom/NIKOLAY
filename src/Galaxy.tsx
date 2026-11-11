import { useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { spiralGalaxy } from './galaxyGeometry'
const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`
const fragment=`
 varying vec2 vUv;uniform float uOpacity;uniform float uSeed;
 float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
 float cloud(vec2 p){return noise(p)*.6+noise(p*2.03+9.)*.28+noise(p*4.1)*.12;}
 void main(){
  vec2 p=(vUv-.5)*2.;float r=length(p);if(r>.98)discard;
  float angle=atan(p.y,p.x),arms=2.+mod(uSeed,3.);
  float n=cloud(p*7.+uSeed),fine=cloud(p*34.+n*2.+uSeed);
  float phase=arms*angle-log(max(r,.025))*(4.2+mod(uSeed,4.)*.37)+n*2.2;
  float arm=pow(.5+.5*cos(phase),4.);
  float lanes=pow(.5+.5*cos(phase+.55+fine*1.7),9.);
  float disk=exp(-r*3.5)*( .12+arm*.95)*(.32+fine*.95);
  disk*=1.-lanes*.85*smoothstep(.06,.25,r);
  float bulge=exp(-r*r*135.)*.9+exp(-r*24.)*.35;
  float veil=exp(-r*5.)*.035;
  vec3 blue=vec3(.34,.52,.8),warm=vec3(1.,.86,.67);
  vec3 color=mix(blue,warm,exp(-r*7.));
  color=mix(color,vec3(.76,.81,.94),fine*.3);
  float rim=1.-smoothstep(.65,.98,r);
  gl_FragColor=vec4(color,(disk+bulge+veil)*rim*uOpacity);
 }
`
export default function Galaxy({seed,position,rotation,scale,opacity,low}:{seed:number;position:[number,number,number];rotation:[number,number,number];scale:number;opacity:RefObject<number>;low:boolean}){
 const root=useRef<THREE.Group>(null),surface=useRef<THREE.ShaderMaterial>(null),stars=useRef<THREE.PointsMaterial>(null)
 const data=useMemo(()=>spiralGalaxy(seed,low?700:1800),[seed,low])
 const uniforms=useMemo(()=>({uOpacity:{value:0},uSeed:{value:seed}}),[seed])
 useFrame((_,dt)=>{
  if(root.current)root.current.rotation.z+=Math.min(dt,.1)*.009
  if(surface.current){surface.current.uniforms.uOpacity.value=opacity.current*.88}
  if(stars.current)stars.current.opacity=opacity.current*.34
 })
 return <group position={position} rotation={rotation} scale={scale}><group ref={root}>
  <mesh><planeGeometry args={[12,12]}/><shaderMaterial ref={surface} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} transparent depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending}/></mesh>
  <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[data.positions,3]}/><bufferAttribute attach="attributes-color" args={[data.colors,3]}/></bufferGeometry><pointsMaterial ref={stars} size={.018} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending}/></points>
 </group></group>
}
