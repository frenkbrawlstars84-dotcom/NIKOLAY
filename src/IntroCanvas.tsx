import { useEffect, useMemo } from 'react'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import BlackHole from './BlackHole'
import CanvasHealth from './CanvasHealth'
import { introFrame } from './introState'
import type { IntroPhase } from './introState'

type Props = { progress: RefObject<number>; elapsed: RefObject<number>; phase: IntroPhase; reduced: boolean; onReady: () => void; onUnavailable: () => void }
function StarFlight({ elapsed, phase, reduced }: Pick<Props, 'elapsed'|'phase'|'reduced'>) {
  const resources = useMemo(() => {
    const points:number[]=[],tips:number[]=[]
    let seed=97
    const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646}
    for(let i=0;i<320;i++){
      const angle=random()*Math.PI*2,radius=2+random()*14,z=-29-random()*65
      for(const tip of [0,1]){points.push(Math.cos(angle)*radius,Math.sin(angle)*radius,z+tip*.65);tips.push(tip)}
    }
    const geometry=new THREE.BufferGeometry()
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geometry.setAttribute('aTip',new THREE.Float32BufferAttribute(tips,1))
    const material=new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uOpacity:{value:0}},vertexShader:`attribute float aTip;varying float vTip;varying float vDepth;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vDepth=-p.z;vTip=aTip;gl_Position=projectionMatrix*p;}`,fragmentShader:`uniform float uOpacity;varying float vTip;varying float vDepth;void main(){float depth=smoothstep(.2,2.,vDepth)*(1.-smoothstep(35.,65.,vDepth));gl_FragColor=vec4(.7,.81,1.,uOpacity*depth*(.15+vTip*.65));}`})
    return {geometry,material}
  },[])
  useEffect(()=>()=>{resources.geometry.dispose();resources.material.dispose()},[resources])
  useFrame(()=>{
    const p=introFrame(elapsed.current,reduced).progress
    resources.material.uniforms.uOpacity.value=phase==='black-hole'||reduced?0:THREE.MathUtils.smoothstep(p,.43,.53)*(1-THREE.MathUtils.smoothstep(p,.88,1))
  })
  return <lineSegments geometry={resources.geometry} material={resources.material} renderOrder={20} frustumCulled={false}/>
}
function IntroCamera({ elapsed, phase, reduced }: Pick<Props, 'elapsed'|'phase'|'reduced'>) {
  const { camera, gl, invalidate } = useThree()
  useEffect(() => { gl.domElement.dataset.scene = 'intro'; invalidate() }, [gl, invalidate, phase, reduced])
  useFrame(() => {
    const distance = reduced ? phase === 'black-hole' ? 20 : -16 : introFrame(elapsed.current).distance
    camera.position.set(0, 0, distance - 24)
    // The eye always faces forward; negative distance continues the star flight.
    camera.lookAt(0, 0, distance - 25)
    gl.domElement.dataset.introDistance = distance.toFixed(3)
  }, -1)
  return null
}
export default function IntroCanvas(props: Props) {
  const supported=useMemo(()=>{try{const gl=document.createElement('canvas').getContext('webgl2');if(!gl)return false;gl.getExtension('WEBGL_lose_context')?.loseContext();return true}catch{return false}},[])
  useEffect(()=>{if(!supported)props.onUnavailable()},[supported,props.onUnavailable])
  if(!supported)return null
  // The intro owns the only live Canvas before the portfolio mounts. R3F
  // releases its renderer/context on unmount; BlackHole disposes its targets,
  // materials and geometry. No fullscreen resources are retained by the hero.
  const low = innerWidth <= 900 || navigator.hardwareConcurrency <= 4
  return <Canvas className="intro-canvas" camera={{position:[0,0,-4],fov:42,near:.1,far:80}} dpr={low?1:[1,1.25]} frameloop={props.reduced?'demand':'always'} gl={{alpha:true,antialias:false,powerPreference:'high-performance'}} aria-label="Чёрная дыра TON 618, погружение и полёт через галактики">
    <IntroCamera elapsed={props.elapsed} phase={props.phase} reduced={props.reduced}/>
    <CanvasHealth onReady={props.onReady} onUnavailable={props.onUnavailable}/>
    <StarFlight elapsed={props.elapsed} phase={props.phase} reduced={props.reduced}/>
    <BlackHole progress={props.progress} clock={props.elapsed} low={low} onUnavailable={props.onUnavailable}/>
  </Canvas>
}
