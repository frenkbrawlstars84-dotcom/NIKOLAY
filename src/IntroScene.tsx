import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import BlackHole from './BlackHole'
import CanvasHealth from './CanvasHealth'
import { introFrame } from './introTimeline'

// Three small, precomputed transparent star-cloud textures. No simulation,
// external images, large models or per-frame texture generation.
function galaxyTexture(kind: number) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024
  const ctx = canvas.getContext('2d')!
  let seed = 417 + kind * 7919
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
  ctx.translate(512,512)
  ctx.rotate(kind === 0 ? -.4 : kind === 1 ? .45 : -.2)
  ctx.scale(1, kind === 0 ? .57 : kind === 1 ? .21 : .8)
  const core = ctx.createRadialGradient(0,0,0,0,0,420)
  core.addColorStop(0,'#f8e9daee');core.addColorStop(.08,'#e5cfbb99');core.addColorStop(.25,'#a9bfe544');core.addColorStop(1,'#718ab900')
  ctx.fillStyle = core; ctx.fillRect(-480,-480,960,960)
  // Fixed distributions: a loose blue spiral, a dusty edge-on disk, an oval.
  for (let i=0;i<12500;i++) {
    const radius = Math.pow(random(), kind === 2 ? 1.8 : .75) * 445
    const arm = Math.floor(random()*3)*Math.PI*2/3
    const angle = kind === 0 ? arm+radius*.016+(random()-.5)*(.28+radius*.0014) : random()*Math.PI*2
    const x = Math.cos(angle)*radius, y = Math.sin(angle)*radius
    const dust = kind === 1 && y > -12 && y < 24 && Math.abs(x)>35
    if (dust && random()<.88) continue
    const alpha = (.15+random()*.55)*(1-radius/510)
    const warm = radius<90 || random()<.22
    ctx.fillStyle = warm ? `rgba(255,229,201,${alpha})` : `rgba(171,201,255,${alpha})`
    const size = .65+Math.pow(random(),5)*2.4
    ctx.fillRect(x,y,size,size*1.6)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

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
    const textures=[0,1,2].map(galaxyTexture)
    const materials=textures.map(map=>new THREE.SpriteMaterial({map,transparent:true,depthWrite:false,depthTest:false,toneMapped:false,opacity:0}))
    return {geometry,material,textures,materials}
  },[low])
  useEffect(()=>()=>{
    resources.geometry.dispose();resources.material.dispose()
    resources.textures.forEach(t=>t.dispose());resources.materials.forEach(m=>m.dispose())
  },[resources])
  useFrame(()=>{
    const state=introFrame(elapsed.current)
    resources.material.uniforms.uTravel.value=state.travel
    resources.material.uniforms.uFlight.value=state.flight
    galaxies.current?.children.forEach((sprite,i)=>{
      const z=-22-i*12+state.travel
      sprite.position.set((i===0?-1:i===1?1:-1)* (3+i*.6), i===0?1.5:i===1?-1.8:.8, z)
      sprite.scale.setScalar(Math.min(i===1?17:14,Math.max(-z,1)*.9))
      resources.materials[i].opacity=state.flight*THREE.MathUtils.smoothstep(-z,4,10)
      resources.materials[i].rotation=(i-1)*.16+state.travel*.002
      sprite.visible=z<2
    })
  })
  return <><lineSegments geometry={resources.geometry} material={resources.material} frustumCulled={false} renderOrder={20}/><group ref={galaxies}>
    {resources.materials.map((material,i)=><sprite key={i} material={material} scale={[i===1?17:14,i===1?17:14,1]} renderOrder={21+i}/>)}</group></>
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
