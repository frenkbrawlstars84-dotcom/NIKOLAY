import { useEffect, useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { MotionValue } from 'motion/react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { projects } from './projects'
import type { Project } from './projects'
import CanvasHealth from './CanvasHealth'
import StudioLighting from './StudioLighting'

export type ScreenSceneProps = { position: MotionValue<number>; pointer: MutableRefObject<{x:number;y:number}>; reduced:boolean; paused:boolean; present:boolean; low:boolean; onReady:()=>void; onUnavailable:()=>void; onImageReady:(index:number)=>void }
function placeholder(project: Project) {
  const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=800
  const ctx=canvas.getContext('2d')!
  const gradient=ctx.createLinearGradient(0,0,1280,800);gradient.addColorStop(0,project.name==='AURA BEAUTY'?'#ede3d2':'#526a99');gradient.addColorStop(1,project.name==='AURA BEAUTY'?'#c4b498':'#233452')
  ctx.fillStyle=gradient;ctx.fillRect(0,0,1280,800)
  ctx.strokeStyle=project.name==='AURA BEAUTY'?'#5a4d3c66':'#d3e1ff77';ctx.lineWidth=1;ctx.strokeRect(50,50,1180,700)
  ctx.fillStyle=project.name==='AURA BEAUTY'?'#4f4233':'#dce7fd';ctx.font='15px Arial';ctx.textAlign='center';ctx.fillText(project.upcoming?'СЛЕДУЮЩАЯ ИСТОРИЯ':'ДЕМОНСТРАЦИОННЫЙ ПРОЕКТ',640,285)
  ctx.fillStyle=project.name==='AURA BEAUTY'?'#2c251e':'#ffffff';ctx.font='54px Arial';ctx.fillText(project.upcoming?'YOUR NEXT IDEA':project.name,640,405)
  ctx.fillStyle=project.name==='AURA BEAUTY'?'#51422f':'#d2dff5';ctx.font='16px Arial';ctx.fillText(project.upcoming?'Место для вашего проекта':'Обложка проекта · не скриншот',640,465)
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace
  return texture
}
function ScreenPanel({ project,index,...props }: ScreenSceneProps & {project:Project;index:number}) {
  const group=useRef<THREE.Group>(null),{ gl,invalidate }=useThree()
  const resources=useMemo(()=>{
    const cover=placeholder(project)
    const frame=new RoundedBoxGeometry(5.6,3.76,.18,props.low?1:2,.075)
    const screen=new THREE.PlaneGeometry(5.34,3.3375)
    const body=new THREE.MeshStandardMaterial({color:'#303033',metalness:.85,roughness:.23,transparent:true})
    const face=new THREE.MeshBasicMaterial({map:cover,toneMapped:false,transparent:true})
    return {cover,frame,screen,body,face}
  },[project,props.low])
  useEffect(()=>{
    if(!project.image)return
    let disposed=false,loaded:THREE.Texture|undefined,frame=0
    const texture=new THREE.TextureLoader().load(project.image,value=>{
      if(disposed){value.dispose();return}
      loaded=value;value.colorSpace=THREE.SRGBColorSpace;value.anisotropy=Math.min(8,gl.capabilities.getMaxAnisotropy());value.needsUpdate=true
      resources.face.map=value;resources.face.needsUpdate=true;invalidate()
      frame=requestAnimationFrame(()=>{if(!disposed)props.onImageReady(index)})
    },undefined,()=>{if(!disposed){invalidate();frame=requestAnimationFrame(()=>props.onImageReady(index))} /* Retain the explicitly labeled cover. */ })
    return()=>{disposed=true;cancelAnimationFrame(frame);if(loaded)loaded.dispose();else texture.dispose()}
  },[project.image,resources,gl,invalidate,props.onImageReady,index])
  useEffect(()=>()=>{resources.cover.dispose();resources.frame.dispose();resources.screen.dispose();resources.body.dispose();resources.face.dispose()},[resources])
  useFrame((_,delta)=>{
    if(!group.current)return
    const offset=index-props.position.get(),distance=Math.abs(offset),dt=Math.min(delta,.05)
    const visible=props.reduced?Math.round(props.position.get())===index:distance<2.05
    group.current.visible=visible
    if(!visible)return
    const attention=Math.exp(-distance*distance*3.2),pointer=props.pointer.current
    const blend=props.reduced?1:1-Math.exp(-dt*9)
    group.current.position.x=THREE.MathUtils.lerp(group.current.position.x,props.reduced?0:offset*2.05,blend)
    group.current.position.y=THREE.MathUtils.lerp(group.current.position.y,props.reduced?0:distance*.12,blend)
    group.current.position.z=THREE.MathUtils.lerp(group.current.position.z,props.reduced?0:-distance*2.8+attention*.28,blend)
    group.current.scale.setScalar(THREE.MathUtils.lerp(group.current.scale.x,props.reduced?1:Math.max(.82,1-distance*.065+attention*.03),blend))
    group.current.rotation.y=THREE.MathUtils.lerp(group.current.rotation.y,props.reduced?0:offset*-.25+pointer.x*.12*attention,blend)
    group.current.rotation.x=THREE.MathUtils.lerp(group.current.rotation.x,props.reduced?0:-.025-pointer.y*.10*attention,blend)
    resources.face.opacity=props.reduced?1:Math.max(.5,1-distance*.18)
    resources.body.opacity=props.reduced?1:THREE.MathUtils.clamp(1-distance*.35,.15,1)
  })
  return <group ref={group} position={[index*1.65,index*.12,-index*2.5]}>
    <mesh geometry={resources.frame} material={resources.body}/>
    <mesh geometry={resources.screen} material={resources.face} position={[0,-.08,.101]}/>
    {[-2.5,-2.35,-2.2].map(x=><mesh key={x} position={[x,1.73,.108]}><circleGeometry args={[.025,8]}/><meshBasicMaterial color="#bdbdbd"/></mesh>)}
  </group>
}
function ScreenWorld(props: ScreenSceneProps) {
  const { camera,size,invalidate }=useThree()
  const distance=useRef(7)
  useEffect(()=>{
    const tangent=Math.tan(40*Math.PI/360),aspect=size.width/size.height
    distance.current=Math.max(3.76*1.04/(2*tangent*.87),5.6*1.04/(2*tangent*aspect*.84))+.28
    camera.position.set(0,.05,distance.current)
    camera.lookAt(0,0,-.2);camera.updateProjectionMatrix();invalidate()
  },[camera,size.width,size.height,invalidate])
  useEffect(()=>props.position.on('change',()=>{if(props.present)invalidate()}),[props.position,props.present,invalidate])
  useFrame((_,delta)=>{
    const p=props.position.get(),dt=Math.min(delta,.05)
    camera.position.x=props.reduced?0:THREE.MathUtils.damp(camera.position.x,Math.sin(p*Math.PI*.65)*.18,6,dt)
    camera.position.y=props.reduced?.05:THREE.MathUtils.damp(camera.position.y,.05+Math.sin(p*Math.PI)*.08,6,dt)
    camera.lookAt(0,0,-.2)
  })
  return <><StudioLighting low={props.low} monochrome={true}/>{projects.map((project,index)=><ScreenPanel key={project.name} project={project} index={index} {...props}/>)}</>
}
export default function ProjectScreenScene(props: ScreenSceneProps) {
  return <Canvas camera={{position:[0,0,7],fov:40,near:.1,far:40}} dpr={props.low?[1,1.25]:[1,1.5]} frameloop={props.paused||props.reduced?'demand':'always'} gl={{alpha:true,antialias:true,powerPreference:'high-performance'}} aria-label="Объёмные экраны демонстрационных проектов AURA BEAUTY и NEXORA DIGITAL">
    <CanvasHealth onReady={props.onReady} onUnavailable={props.onUnavailable}/><ScreenWorld {...props}/>
  </Canvas>
}
