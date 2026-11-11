import { useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { spiralGalaxy } from './galaxyGeometry'
import type { GalaxyKind } from './galaxyGeometry'
const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`
const fragment=`
 varying vec2 vUv;uniform float uOpacity;uniform float uSeed;uniform float uType;
 float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
 float cloud(vec2 p){return noise(p)*.6+noise(p*2.03+9.)*.28+noise(p*4.1)*.12;}
 void main(){
  vec2 p=(vUv-.5)*2.;
  if(uType>2.5)p.y*=2.05;else if(uType>1.5)p.y*=1.35;
  float r=length(p);if(r>.98)discard;
  float angle=atan(p.y,p.x),arms=uType>.5&&uType<1.5?2.:2.+mod(uSeed,3.);
  float n=cloud(p*7.+uSeed),fine=cloud(p*36.+n*2.+uSeed);
  float phase=arms*angle-log(max(r,.025))*(4.2+mod(uSeed,4.)*.37)+n*3.2;
  float arm=pow(.5+.5*cos(phase),3.5+noise(p*4.+uSeed)*2.);
  float lanes=pow(.5+.5*cos(phase+.6+fine*2.),8.);
  float disk=exp(-r*3.5)*(.1+arm*1.05)*(.25+fine*1.15);
  disk*=1.-lanes*.91*smoothstep(.06,.22,r);
  float bulge=exp(-r*r*125.)*(.55+fine*.5)+exp(-r*23.)*.35;
  float formation=smoothstep(.68,.88,noise(p*65.+uSeed))*arm*smoothstep(.1,.3,r)*exp(-r*3.5)*.22;
  if(uType>.5&&uType<1.5)bulge+=exp(-p.y*p.y*500.-p.x*p.x*26.)*.4;
  if(uType>1.5&&uType<2.5){disk=exp(-r*7.)*(.28+fine*.22);bulge=exp(-r*r*95.)*(.7+fine*.2);formation=0.;}
  if(uType>2.5){disk=exp(-r*5.)*(.16+fine*.23)*(1.-pow(lanes,.5)*.6);formation*=.2;}
  vec3 color=mix(vec3(.38,.54,.77),vec3(1.,.88,.73),exp(-r*7.));
  color=mix(color,vec3(.76,.82,.95),fine*.3);
  vec3 emission=color*(disk+bulge)+vec3(.45,.67,1.)*formation;
  float rim=1.-smoothstep(.65,.98,r);
  // Compress the bright core while retaining its fine structure.
  emission*=1.35/(1.+max(emission.r,max(emission.g,emission.b))*.9);
  gl_FragColor=vec4(emission,rim*uOpacity);
 }
`
const starVertex=`attribute vec3 color;attribute float aSize;attribute float aBrightness;uniform float uOpacity;uniform float uPixelRatio;varying vec3 vColor;varying float vAlpha;void main(){vec4 view=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*view;gl_PointSize=clamp(aSize*uPixelRatio*38.*length(modelMatrix[0].xyz)/max(1.,-view.z),.55,4.);vColor=color;vAlpha=uOpacity*aBrightness*smoothstep(.6,4.,-view.z);}`
const starFragment=`varying vec3 vColor;varying float vAlpha;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;gl_FragColor=vec4(vColor,exp(-r*r*20.)*vAlpha);}`
export default function Galaxy({seed,position,rotation,scale,opacity,low,kind='spiral'}:{seed:number;position:[number,number,number];rotation:[number,number,number];scale:number;opacity:RefObject<number>;low:boolean;kind?:GalaxyKind}){
 const root=useRef<THREE.Group>(null),surface=useRef<THREE.ShaderMaterial>(null),stars=useRef<THREE.ShaderMaterial>(null)
 const data=useMemo(()=>spiralGalaxy(seed,low?800:1900,kind),[seed,low,kind])
 const uniforms=useMemo(()=>({uOpacity:{value:0},uSeed:{value:seed},uType:{value:['spiral','barred','elliptical','lenticular'].indexOf(kind)}}),[seed,kind])
 const starUniforms=useMemo(()=>({uOpacity:{value:0},uPixelRatio:{value:Math.min(devicePixelRatio,1.25)}}),[])
 useFrame((_,dt)=>{
  if(root.current)root.current.rotation.z+=Math.min(dt,.1)*.009
  if(surface.current)surface.current.uniforms.uOpacity.value=opacity.current*.9
  if(stars.current)stars.current.uniforms.uOpacity.value=opacity.current*.45
 })
 return <group position={position} rotation={rotation} scale={scale}><group ref={root}>
  <mesh><planeGeometry args={[12,12]}/><shaderMaterial ref={surface} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} transparent forceSinglePass depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending}/></mesh>
  <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[data.positions,3]}/><bufferAttribute attach="attributes-color" args={[data.colors,3]}/><bufferAttribute attach="attributes-aSize" args={[data.sizes,1]}/><bufferAttribute attach="attributes-aBrightness" args={[data.brightness,1]}/></bufferGeometry><shaderMaterial ref={stars} uniforms={starUniforms} vertexShader={starVertex} fragmentShader={starFragment} transparent depthWrite={false} blending={THREE.AdditiveBlending}/></points>
 </group></group>
}
