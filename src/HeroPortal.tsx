import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export type PortalFrame = { x: number; y: number; width: number; height: number }
type Props = { reduced: boolean; paused: boolean; low: boolean; frame: RefObject<PortalFrame>; anchor: RefObject<HTMLDivElement | null> }

// Four batches, no framebuffer enlargement or postprocessing. Width is real
// geometry, with a soft emissive profile inside each ribbon rather than lines.
function stripGeometry(lanes: number, segments: number) {
  const paths: number[]=[],sides: number[]=[],ids: number[]=[],indices: number[]=[]
  for(let lane=0;lane<lanes;lane++)for(let step=0;step<=segments;step++){
    for(const side of [-1,1]){paths.push(step/segments);sides.push(side);ids.push(lane)}
    if(step<segments){const a=(lane*(segments+1)+step)*2;indices.push(a,a+1,a+2,a+1,a+3,a+2)}
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(paths.length*3),3))
  geometry.setAttribute('aPath',new THREE.Float32BufferAttribute(paths,1))
  geometry.setAttribute('aSide',new THREE.Float32BufferAttribute(sides,1))
  geometry.setAttribute('aLane',new THREE.Float32BufferAttribute(ids,1))
  geometry.setIndex(indices)
  return geometry
}
const common=`
  // HERO_ENERGY_PORTAL — energy funnel only, never an accretion disk.
  uniform float uTime;uniform float uReveal;uniform float uVisibility;
  uniform vec2 uPointer;
  attribute float aPath;attribute float aSide;attribute float aLane;
  varying float vPath;varying float vSide;varying float vLane;
  const float TAU=6.28318530718;
`
const ribbonVertex=common+`
  void main(){
    float t=aPath,phase=aLane*TAU/7.;
    float angle=phase+t*6.8+uTime*(.11+.006*aLane);
    float radius=mix(1.94,.24,pow(t,.8))+.07*sin(t*8.+phase+uTime*.28);
    float width=mix(.105,.025,t);
    radius+=aSide*width;
    vec3 p=vec3(cos(angle)*radius,sin(angle)*radius,.8-t*4.8);
    p.xy+=vec2(.32,-.06)*t*t+uPointer*t*.045;
    p.xy*=1.+.012*sin(uTime*.7+phase);
    vPath=t;vSide=aSide;vLane=aLane;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
  }
`
const ribbonFragment=`
  uniform float uTime;uniform float uReveal;uniform float uVisibility;
  varying float vPath;varying float vSide;varying float vLane;
  void main(){
    float edge=exp(-vSide*vSide*3.3),core=exp(-vSide*vSide*70.);
    float flow=.65+.35*sin(vPath*23.-uTime*1.8+vLane*2.);
    float fade=smoothstep(0.,.055,vPath)*(1.-smoothstep(.7,1.,vPath));
    vec3 color=mix(vec3(.28,.42,.62),vec3(.91,.96,1.),core);
    gl_FragColor=vec4(color,(edge*.19+core*.62)*flow*fade*uReveal*uVisibility);
  }
`
const membraneVertex=common+`
  void main(){
    float depth=(aLane<1.?0.:1.);
    float t=aPath,angle=(aSide*.5+.5)*TAU;
    float radius=mix(1.88,.22,pow(t,.8))*(1.+depth*.045);
    radius+=.035*sin(angle*5.+t*8.-uTime*.25+depth);
    vec3 p=vec3(cos(angle)*radius,sin(angle)*radius,.76-t*4.8-depth*.06);
    p.xy+=vec2(.32,-.06)*t*t;
    vPath=t;vSide=angle;vLane=depth;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
  }
`
const membraneFragment=`
  uniform float uTime;uniform float uReveal;uniform float uVisibility;
  varying float vPath;varying float vSide;varying float vLane;
  void main(){
    float spiral=pow(.5+.5*sin(vSide*7.-vPath*16.+uTime*.5+vLane),5.);
    float inner=pow(.5+.5*sin(vSide*3.+vPath*11.-uTime*.23),3.);
    float edge=(1.-smoothstep(0.,.09,vPath))*.25;
    float fade=1.-smoothstep(.78,1.,vPath);
    vec3 color=mix(vec3(.11,.2,.34),vec3(.63,.75,.92),spiral);
    gl_FragColor=vec4(color,(.026+spiral*.11+inner*.035+edge)*fade*uReveal*uVisibility);
  }
`
const arcVertex=common+`
  void main(){
    float direction=mod(aLane,2.)<.5?1.:-1.;
    float angle=aPath*(3.7-aLane*.32)+aLane*1.68+uTime*(.045+aLane*.012)*direction;
    float radius=1.96+aLane*.105+aSide*(.04+aLane*.007)+.018*sin(angle*3.+uTime*.3);
    vec3 p=vec3(cos(angle)*radius,sin(angle)*radius,.82-aLane*.11);
    vPath=aPath;vSide=aSide;vLane=aLane;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
  }
`
const arcFragment=`
  uniform float uTime;uniform float uReveal;uniform float uVisibility;
  varying float vPath;varying float vSide;varying float vLane;
  void main(){
    float end=smoothstep(0.,.09,vPath)*(1.-smoothstep(.85,1.,vPath));
    float light=exp(-vSide*vSide*3.)*.22+exp(-vSide*vSide*55.)*.65;
    float pulse=.8+.2*sin(uTime*.4+vLane*2.);
    gl_FragColor=vec4(mix(vec3(.42,.57,.78),vec3(.87,.94,1.),exp(-vSide*vSide*20.)),light*end*pulse*uReveal*uVisibility);
  }
`
const particleVertex=`
  uniform float uTime;uniform float uReveal;uniform float uVisibility;uniform float uDpr;uniform vec2 uPointer;
  attribute float aSeed;attribute float aPath;varying float vAlpha;
  void main(){
    float t=fract(aPath+uTime*(.033+aSeed*.026));
    float angle=aSeed*137.5+t*7.+uTime*.08;
    float radius=mix(2.55,.18,t)*(.62+aSeed*.55);
    vec3 p=vec3(cos(angle)*radius,sin(angle)*radius,.95-t*5.5);
    p.xy+=vec2(.32,-.06)*t*t+uPointer*(.04+.06*t);
    vec4 view=modelViewMatrix*vec4(p,1.);
    gl_Position=projectionMatrix*view;
    gl_PointSize=clamp((9.+aSeed*10.)*uDpr/max(1.,-view.z),1.,3.5*uDpr);
    vAlpha=smoothstep(0.,.12,t)*(1.-smoothstep(.72,1.,t))*(.18+aSeed*.6)*uReveal*uVisibility;
  }
`
const particleFragment=`varying float vAlpha;void main(){float r=length(gl_PointCoord-.5);gl_FragColor=vec4(.72,.83,1.,exp(-r*r*18.)*vAlpha);}`

export default function HeroPortal({ reduced, paused, low, frame, anchor }: Props) {
  const root=useRef<THREE.Group>(null),clock=useRef(0),fresh=useRef(true)
  const intent=useRef({x:0,y:0,at:-Infinity}),pointer=useRef(new THREE.Vector2())
  const {camera,size,gl,invalidate}=useThree()
  const resources=useMemo(()=>{
    const uniforms={uTime:{value:0},uReveal:{value:reduced?1:0},uVisibility:{value:1},uPointer:{value:new THREE.Vector2()},uDpr:{value:1}}
    const make=(vertexShader:string,fragmentShader:string)=>new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms,transparent:true,depthWrite:false,depthTest:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending})
    const ribbons=stripGeometry(7,low?72:128),arcs=stripGeometry(4,low?56:96)
    const membrane=new THREE.BufferGeometry(),paths:number[]=[],sides:number[]=[],lanes:number[]=[],indices:number[]=[]
    const rings=low?22:36,sectors=low?48:80
    for(let layer=0;layer<2;layer++)for(let row=0;row<=rings;row++)for(let col=0;col<=sectors;col++){
      paths.push(row/rings);sides.push(col/sectors*2-1);lanes.push(layer)
      if(row<rings&&col<sectors){const a=layer*(rings+1)*(sectors+1)+row*(sectors+1)+col;indices.push(a,a+1,a+sectors+1,a+1,a+sectors+2,a+sectors+1)}
    }
    membrane.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(paths.length*3),3))
    membrane.setAttribute('aPath',new THREE.Float32BufferAttribute(paths,1));membrane.setAttribute('aSide',new THREE.Float32BufferAttribute(sides,1));membrane.setAttribute('aLane',new THREE.Float32BufferAttribute(lanes,1));membrane.setIndex(indices)
    const particles=new THREE.BufferGeometry(),count=low?240:720,seed=new Float32Array(count),path=new Float32Array(count)
    for(let i=0;i<count;i++){seed[i]=(i*.61803398875)%1;path[i]=(i*.754877666)%1}
    particles.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(count*3),3));particles.setAttribute('aSeed',new THREE.Float32BufferAttribute(seed,1));particles.setAttribute('aPath',new THREE.Float32BufferAttribute(path,1))
    return {uniforms,ribbons,arcs,membrane,particles,ribbonMaterial:make(ribbonVertex,ribbonFragment),arcMaterial:make(arcVertex,arcFragment),membraneMaterial:make(membraneVertex,membraneFragment),particleMaterial:make(particleVertex,particleFragment)}
  },[low,reduced])
  useEffect(()=>()=>{resources.ribbons.dispose();resources.arcs.dispose();resources.membrane.dispose();resources.particles.dispose();resources.ribbonMaterial.dispose();resources.arcMaterial.dispose();resources.membraneMaterial.dispose();resources.particleMaterial.dispose()},[resources])
  useEffect(()=>{
    fresh.current=true;invalidate()
    if(paused||reduced)return
    const move=(event:PointerEvent)=>{
      if(event.pointerType==='touch'||!anchor.current)return
      const area=anchor.current.getBoundingClientRect()
      intent.current={x:THREE.MathUtils.clamp((event.clientX-area.left)/area.width*2-1,-1,1),y:THREE.MathUtils.clamp(1-(event.clientY-area.top)/area.height*2,-1,1),at:performance.now()}
    }
    window.addEventListener('pointermove',move,{passive:true})
    return()=>window.removeEventListener('pointermove',move)
  },[paused,reduced,anchor,invalidate])
  useFrame((_,delta)=>{
    const dt=fresh.current?0:Math.max(0,delta);fresh.current=false
    if(!paused&&!reduced)clock.current+=dt
    const activity=reduced||paused?0:Math.exp(-Math.max(0,performance.now()-intent.current.at-250)*.0025)
    pointer.current.x=THREE.MathUtils.damp(pointer.current.x,intent.current.x*activity,4.5,dt)
    pointer.current.y=THREE.MathUtils.damp(pointer.current.y,intent.current.y*activity,4.5,dt)
    const u=resources.uniforms
    u.uTime.value=clock.current;u.uPointer.value.copy(pointer.current);u.uDpr.value=gl.getPixelRatio()
    u.uReveal.value=reduced||paused?1:THREE.MathUtils.damp(u.uReveal.value,1,4,dt)
    const scroll=reduced?0:THREE.MathUtils.clamp(scrollY/Math.max(640,innerHeight),0,1)
    u.uVisibility.value=1-THREE.MathUtils.smoothstep(scroll,.2,.95)*.8
    const height=2*7.4*Math.tan(42*Math.PI/360),width=height*size.width/size.height
    if(root.current){
      root.current.position.set(frame.current.x*width,frame.current.y*height,.05)
      const scale=Math.min(frame.current.width*width/5.65,frame.current.height*height/5.25)
      root.current.scale.setScalar(scale*(.975+.025*u.uReveal.value))
      root.current.rotation.set(.12+pointer.current.y*.055,-.26+pointer.current.x*.08+scroll*.045,-.21+Math.sin(clock.current*.12)*.012)
    }
    camera.position.x=pointer.current.x*.035;camera.position.y=pointer.current.y*.025
  })
  return <group ref={root}>
    <mesh geometry={resources.membrane} material={resources.membraneMaterial} frustumCulled={false} renderOrder={1}/>
    <mesh geometry={resources.ribbons} material={resources.ribbonMaterial} frustumCulled={false} renderOrder={2}/>
    <mesh geometry={resources.arcs} material={resources.arcMaterial} frustumCulled={false} renderOrder={3}/>
    <points geometry={resources.particles} material={resources.particleMaterial} frustumCulled={false} renderOrder={4}/>
  </group>
}
