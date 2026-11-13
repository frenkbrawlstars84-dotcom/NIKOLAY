import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import BlackHole from './BlackHole'
import CanvasHealth from './CanvasHealth'
import { introFrame } from './introTimeline'

const starVertex = `
  uniform float uTravel;
  uniform float uFlight;
  attribute float aTip;
  attribute float aSeed;
  varying float vAlpha;
  void main(){
    vec3 p=position;
    p.z=mod(p.z+uTravel+80.,80.)-68.;
    p.z+=aTip*(.035+uFlight*(.22+aSeed*.5));
    p.xy+=vec2(sin(uTravel*.035),cos(uTravel*.025))*(.05+aSeed*.12);
    vec4 view=modelViewMatrix*vec4(p,1.);
    float depth=-view.z;
    vAlpha=uFlight*(.4+aSeed*.6)*smoothstep(.5,3.,depth)*(1.-smoothstep(42.,72.,depth));
    gl_Position=projectionMatrix*view;
  }
`
const starFragment = `varying float vAlpha; void main(){gl_FragColor=vec4(.72,.83,1.,vAlpha);}`
function Flight({ elapsed, low }: { elapsed: RefObject<number>; low: boolean }) {
  const galaxies = useRef<THREE.Group>(null)
  const resources = useMemo(() => {
    const vertices:number[]=[], tips:number[]=[], seeds:number[]=[]
    let seed=91573
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
    const count = low ? 280 : 600
    for(let i=0;i<count;i++) {
      const angle=random()*Math.PI*2, radius=1.3+Math.sqrt(random())*21
      const depth=-random()*80, brightness=random()
      for(const tip of [0,1]) {
        vertices.push(Math.cos(angle)*radius,Math.sin(angle)*radius,depth)
        tips.push(tip);seeds.push(brightness)
      }
    }
    const geometry=new THREE.BufferGeometry()
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3))
    geometry.setAttribute('aTip',new THREE.Float32BufferAttribute(tips,1))
    geometry.setAttribute('aSeed',new THREE.Float32BufferAttribute(seeds,1))
    const material=new THREE.ShaderMaterial({vertexShader:starVertex,fragmentShader:starFragment,transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,uniforms:{uTravel:{value:0},uFlight:{value:0}}})
    const textures:THREE.Texture[]=[]
    const materials=[0,1].map(()=>new THREE.SpriteMaterial({transparent:true,depthWrite:false,depthTest:false,toneMapped:false,opacity:0}))
    return {geometry,material,textures,materials}
  },[low])
  useEffect(()=>{
    let disposed=false
    const atlas=new THREE.TextureLoader().load('/space/galaxies.webp',value=>{
      if(disposed)return
      value.colorSpace=THREE.SRGBColorSpace
      resources.materials.forEach((material,i)=>{
        const tile=value.clone();tile.repeat.set(.5,1);tile.offset.set(i*.5,0)
        tile.needsUpdate=true;resources.textures.push(tile)
        material.map=tile;material.needsUpdate=true
      })
    },undefined,()=>{/* Stars and the main site remain usable if the atlas fails. */})
    return()=>{disposed=true;atlas.dispose()}
  },[resources])
  useEffect(()=>()=>{
    resources.geometry.dispose();resources.material.dispose()
    resources.textures.forEach(t=>t.dispose());resources.materials.forEach(m=>m.dispose())
  },[resources])
  useFrame(()=>{
    const state=introFrame(elapsed.current)
    resources.material.uniforms.uTravel.value=state.travel
    resources.material.uniforms.uFlight.value=state.flight
    galaxies.current?.children.forEach((sprite,i)=>{
      const z=-18-i*20+state.travel
      sprite.position.set((i===0?-1:1)*(low?1.3:3.2),i===0?.65:-.8,z)
      const height=(low?6.3:9)*(i===0?1:1.12)
      sprite.scale.set(height*1,height,1)
      resources.materials[i].opacity=(resources.materials[i].map?1:0)*state.flight*THREE.MathUtils.smoothstep(-z,3,7)*(i===0?1:.85)
      resources.materials[i].rotation=(i===0?-.08:.15)+state.travel*.001
      sprite.visible=z<0&&resources.materials[i].opacity>0
    })
  })
  return <><lineSegments geometry={resources.geometry} material={resources.material} frustumCulled={false} renderOrder={20}/><group ref={galaxies}>
    {resources.materials.map((material,i)=><sprite key={i} material={material} scale={[9*1,9,1]} renderOrder={21+i}/>)}</group></>
}
export default function IntroScene({ elapsed,onReady,onUnavailable }: {elapsed:RefObject<number>;onReady:()=>void;onUnavailable:()=>void}) {
  const [low]=useState(()=>innerWidth<=900||navigator.hardwareConcurrency<=4)
  const [visible,setVisible]=useState(!document.hidden)
  useEffect(()=>{
    const visibility=()=>setVisible(!document.hidden)
    document.addEventListener('visibilitychange',visibility)
    return()=>document.removeEventListener('visibilitychange',visibility)
  },[])
  return <Canvas camera={{position:[0,0,0],fov:48,near:.1,far:85}} dpr={low?1:[1,1.5]} frameloop={visible?'always':'demand'} gl={{antialias:true,alpha:true,powerPreference:'high-performance'}} aria-label="Чёрная дыра и короткий полёт через звёзды и галактики">
    <CanvasHealth onReady={onReady} onUnavailable={onUnavailable}/><BlackHole elapsed={elapsed} low={low} onUnavailable={onUnavailable}/><Flight elapsed={elapsed} low={low}/>
  </Canvas>
}
