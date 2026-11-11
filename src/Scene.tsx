import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import SceneFallback from './SceneFallback'
import CanvasHealth from './CanvasHealth'
import useSceneBudget from './useSceneBudget'

type IntroFrame = { x: number; y: number; width: number; height: number }
type SceneProps = { reduced: boolean; paused: boolean; anchor: RefObject<HTMLDivElement | null>; onReady: () => void; onUnavailable: () => void }
const vertex = `
  // HERO_SCULPTURE: decorative form only; no scroll journey or portal.
  uniform float uTime;
  uniform float uReveal;
  attribute float aStrand;
  varying float vLight;
  void main() {
    float t=uTime*.16;
    vec3 p=position;
    p.xy*=1.+.06*sin(p.z*1.7+t);
    p.x+=sin(p.y*1.3+t)*.08;
    vLight=.3+.7*pow(.5+.5*sin(aStrand*28.+t),2.);
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p*uReveal,1.);
  }
`
const fragment = `
  varying float vLight;
  void main(){gl_FragColor=vec4(vec3(.81,.83,.87)*vLight,.48*(.35+.65*vLight));}
`
function Sculpture({ reduced, paused, low, frame }: { reduced: boolean; paused: boolean; low: boolean; frame: RefObject<IntroFrame> }) {
  const object=useRef<THREE.Group>(null)
  const { invalidate, size }=useThree()
  const pointer=useRef({x:0,y:0}),clock=useRef(0)
  useEffect(()=>{
    if(reduced||paused)return
    const move=(e:PointerEvent)=>{if(e.pointerType!=='touch')pointer.current={x:e.clientX/innerWidth*2-1,y:1-e.clientY/innerHeight*2}}
    window.addEventListener('pointermove',move,{passive:true})
    return ()=>window.removeEventListener('pointermove',move)
  },[reduced,paused])
  useEffect(()=>{invalidate()},[invalidate,reduced,paused])
  const material=useMemo(()=>new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0},uReveal:{value:1}}}),[])
  const geometry=useMemo(()=>{
    const strands=low?36:76,segments=low?104:168,points:number[]=[],ids:number[]=[]
    for(let j=0;j<strands;j++){
      const f=j/strands,a=f*Math.PI*2
      for(let k=0;k<segments;k++)for(const n of [k,k+1]){
        const t=n/segments*Math.PI*2,r=1.55+.46*Math.cos(3*t+a)
        points.push(r*Math.cos(t),r*Math.sin(t),.57*Math.sin(3*t+a)+.17*Math.cos(a));ids.push(f)
      }
    }
    const result=new THREE.BufferGeometry()
    result.setAttribute('position',new THREE.Float32BufferAttribute(points,3));result.setAttribute('aStrand',new THREE.Float32BufferAttribute(ids,1))
    return result
  },[low])
  useEffect(()=>()=>{geometry.dispose()},[geometry])
  useEffect(()=>()=>{material.dispose()},[material])
  useFrame((_,delta)=>{
    if(!paused&&!reduced)clock.current+=Math.min(delta,.1)
    material.uniforms.uTime.value=clock.current
    const height=2*7.4*Math.tan(42*Math.PI/360),width=height*size.width/size.height
    if(object.current){
      object.current.position.set(frame.current.x*width,frame.current.y*height,0)
      object.current.scale.setScalar(Math.min(frame.current.width*width,frame.current.height*height)/4.7)
      object.current.rotation.set(.3+(reduced?0:pointer.current.y*.15),-.4+(reduced?0:pointer.current.x*.2+Math.sin(clock.current*.07)*.15),-.35)
    }
  })
  return <group ref={object}><lineSegments geometry={geometry} material={material} frustumCulled={false}/></group>
}

export default function Scene({ reduced, paused, anchor, onReady, onUnavailable }: SceneProps) {
  const [supported] = useState(() => {
    try {
      const gl = document.createElement('canvas').getContext('webgl2')
      if (!gl) return false
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      return true
    } catch { return false }
  })
  useEffect(() => { if (!supported) onUnavailable() }, [supported, onUnavailable])
  const [visible, setVisible] = useState(!document.hidden)
  const host = useRef<HTMLDivElement>(null)
  const ownsFrame = useSceneBudget(host, supported)
  const frame = useRef<IntroFrame>({ x: .25, y: 0, width: .5, height: .65 })
  const [inView, setInView] = useState(true)
  const [low, setLow] = useState(() => matchMedia('(max-width: 900px)').matches || navigator.hardwareConcurrency <= 4)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting))
    if (host.current) observer.observe(host.current)
    const measure = () => {
      if (!host.current || !anchor.current) return
      const full = host.current.getBoundingClientRect(), area = anchor.current.getBoundingClientRect()
      frame.current = { x: (area.left + area.width / 2 - full.left) / full.width - .5, y: .5 - (area.top + area.height / 2 - full.top) / full.height, width: area.width / full.width, height: area.height / full.height }
    }
    const resizeObserver = new ResizeObserver(measure)
    if (host.current) resizeObserver.observe(host.current)
    if (anchor.current) resizeObserver.observe(anchor.current)
    const media = matchMedia('(max-width: 900px)')
    const resize = () => { setLow(media.matches || navigator.hardwareConcurrency <= 4); measure() }
    const visibility = () => setVisible(!document.hidden)
    media.addEventListener('change', resize)
    document.addEventListener('visibilitychange', visibility)
    measure()
    return () => {
      observer.disconnect(); resizeObserver.disconnect()
      media.removeEventListener('change', resize)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [anchor])
  return <div ref={host} className="scene-host" data-scene-running={ownsFrame && !reduced && !paused && visible && inView}>{supported ? <Canvas
    aria-label="Процедурная пространственная спираль"
    camera={{ position: [0, 0, 7.4], fov: 42, near: .1, far: 70 }} dpr={low ? 1 : [1, 1.25]} frameloop={reduced || paused || !visible || !inView || !ownsFrame ? 'demand' : 'always'}
    gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
  ><CanvasHealth onReady={onReady} onUnavailable={onUnavailable}/><Sculpture reduced={reduced} paused={paused || !visible || !inView || !ownsFrame} low={low} frame={frame} /></Canvas> : <SceneFallback />}</div>
}
