import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { MotionValue } from 'motion/react'
import useSceneBudget from './useSceneBudget'
import { projects } from './projects'
const ProjectScreenScene=lazy(()=>import('./ProjectScreenScene'))
class ScreenBoundary extends Component<{children:ReactNode;fallback:ReactNode;fail:()=>void},{failed:boolean}> {
  state={failed:false}
  static getDerivedStateFromError(){return{failed:true}}
  componentDidCatch(){this.props.fail()}
  render(){return this.state.failed?this.props.fallback:this.props.children}
}
export default function ProjectScreens({position,active,reduced,paused}:{position:MotionValue<number>;active:number;reduced:boolean;paused:boolean}) {
  const [decoded,setDecoded]=useState(()=>new Set(projects.flatMap((project,i)=>project.image?[]:[i])))
  const imageReady=useCallback((index:number)=>setDecoded(previous=>{if(previous.has(index))return previous;const next=new Set(previous);next.add(index);return next}),[])
  const host=useRef<HTMLDivElement>(null),pointer=useRef({x:0,y:0})
  const [started,setStarted]=useState(false)
  const [seen,setSeen]=useState(false),[inView,setInView]=useState(false),[visible,setVisible]=useState(!document.hidden)
  useEffect(()=>{if(seen&&!paused)setStarted(true)},[seen,paused])
  const [low,setLow]=useState(()=>innerWidth<=900||navigator.hardwareConcurrency<=4)
  const [status,setStatus]=useState<'loading'|'ready'|'fallback'>('loading'),phase=useRef(status)
  const ownsFrame=useSceneBudget(host,status!=='fallback')
  const fail=useCallback(()=>{phase.current='fallback';setStatus('fallback')},[])
  const ready=useCallback(()=>{if(phase.current==='loading'){phase.current='ready';setStatus('ready')}},[])
  useEffect(()=>{
    const observer=new IntersectionObserver(([e])=>{setInView(e.isIntersecting);if(e.isIntersecting)setSeen(true)},{rootMargin:'700px'})
    if(host.current)observer.observe(host.current)
    const media=matchMedia('(max-width:900px)'),resize=()=>setLow(media.matches||navigator.hardwareConcurrency<=4),visibility=()=>setVisible(!document.hidden)
    media.addEventListener('change',resize);document.addEventListener('visibilitychange',visibility)
    return()=>{observer.disconnect();media.removeEventListener('change',resize);document.removeEventListener('visibilitychange',visibility)}
  },[])
  useEffect(()=>{if(started&&inView&&visible&&status==='loading'){const timeout=setTimeout(fail,10000);return()=>clearTimeout(timeout)}},[started,inView,visible,status,fail])
  useEffect(()=>{
    if(!seen)return
    const images=projects.flatMap(project=>{
      if(!project.image)return []
      const image=new Image();image.decoding='async';image.src=project.image
      image.decode().catch(()=>{/* Explicit cover remains available on failure. */})
      return [image]
    })
    return()=>{images.forEach(image=>{image.onload=null;image.onerror=null})}
  },[seen])
  const project=projects[active],running=ownsFrame&&inView&&visible&&!paused&&!reduced
  const fallback=<div className={`screen-static-fallback ${project.name==='AURA BEAUTY'?'cover-aura':'cover-digital'}`}>{project.image&&<img key={project.image} style={{opacity:0}} onLoad={e=>{e.currentTarget.style.opacity="1"}} src={project.image} alt={`Скриншот сайта ${project.name}`} decoding="async" onError={e=>{e.currentTarget.style.display='none'}}/>}<><span>{project.upcoming?'СЛЕДУЮЩАЯ ГЛАВА':'ДЕМОНСТРАЦИОННЫЙ ПРОЕКТ'}</span><strong>{project.name}</strong><small>Обложка проекта · не скриншот</small></></div>
  return <div className="project-screens" ref={host} data-screen-status={status} data-scene-running={running} onPointerMove={e=>{if(reduced||e.pointerType==='touch')return;const r=e.currentTarget.getBoundingClientRect();pointer.current={x:(e.clientX-r.left)/r.width-.5,y:(e.clientY-r.top)/r.height-.5}}} onPointerLeave={()=>{pointer.current={x:0,y:0}}}>
    {(status!=='ready'||!decoded.has(active))&&fallback}
    {started&&status!=='fallback'&&<div className="screen-render-layer" style={{visibility:status==='ready'&&decoded.has(active)?'visible':'hidden'}}><ScreenBoundary fail={fail} fallback={null}><Suspense fallback={null}><ProjectScreenScene onImageReady={imageReady} position={position} pointer={pointer} reduced={reduced} paused={!running} present={inView&&visible} low={low} onReady={ready} onUnavailable={fail}/></Suspense></ScreenBoundary></div>}
  </div>
}
