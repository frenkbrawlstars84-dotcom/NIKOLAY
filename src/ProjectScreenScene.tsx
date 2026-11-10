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

export type ScreenSceneProps = { position: MotionValue<number>; pointer: MutableRefObject<{x:number;y:number}>; reduced:boolean; paused:boolean; present:boolean; low:boolean; onReady:()=>void; onUnavailable:()=>void }
function placeholder(project: Project) {
  const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=800
  const ctx=canvas.getContext('2d')!
  const gradient=ctx.createLinearGradient(0,0,1280,800);gradient.addColorStop(0,'#24262a');gradient.addColorStop(1,'#101113')
  ctx.fillStyle=gradient;ctx.fillRect(0,0,1280,800)
  ctx.strokeStyle='#ffffff22';ctx.lineWidth=1;ctx.strokeRect(50,50,1180,700)
  ctx.fillStyle='#a0a0a0';ctx.font='15px Arial';ctx.textAlign='center';ctx.fillText(project.upcoming?'СЛЕДУЮЩАЯ ИСТОРИЯ':'ДЕМОНСТРАЦИОННЫЙ ПРОЕКТ',640,285)
  ctx.fillStyle='#f0f0f0';ctx.font='54px Arial';ctx.fillText(project.upcoming?'YOUR NEXT IDEA':project.name,640,405)
  ctx.fillStyle='#858585';ctx.font='16px Arial';ctx.fillText(project.upcoming?'Место для вашего проекта':'Обложка проекта · не скриншот',640,465)
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
    let disposed=false,loaded:THREE.Texture|undefined
    const texture=new THREE.TextureLoader().load(project.image,value=>{
      if(disposed){value.dispose();return}
      loaded=value;value.colorSpace=THREE.SRGBColorSpace;value.anisotropy=Math.min(4,gl.capabilities.getMaxAnisotropy());value.needsUpdate=true
      resources.face.map=value;resources.face.needsUpdate=true;invalidate()
    },undefined,()=>{ /* Retain the explicitly labeled cover; never blank the app. */ })
    return()=>{disposed=true;if(loaded)loaded.dispose();else texture.dispose()}
  },[project.image,resources,gl,invalidate])
  useEffect(()=>()=>{resources.cover.dispose();resources.frame.dispose();resources.screen.dispose();resources.body.dispose();resources.face.dispose()},[resources])
  useFrame((_,delta)=>{
    if(!group.current)return
    const offset=index-props.position.get(),distance=Math.abs(offset),dt=Math.min(delta,.05)
    const visible=props.reduced?Math.round(props.position.get())===index:distance<2.05
    group.current.visible=visible
    if(!visible)return
    const attention=Math.max(0,1-distance),pointer=props.pointer.current
    const blend=props.reduced?1:1-Math.exp(-dt*9)
    group.current.position.x=THREE.MathUtils.lerp(group.current.position.x,props.reduced?0:offset*1.65,blend)
    group.current.position.y=THREE.MathUtils.lerp(group.current.position.y,props.reduced?0:distance*.12,blend)
    group.current.position.z=THREE.MathUtils.lerp(group.current.position.z,props.reduced?0:-distance*2.5,blend)
    group.current.rotation.y=THREE.MathUtils.lerp(group.current.rotation.y,props.reduced?0:offset*-.25+pointer.x*.18*attention,blend)
    group.current.rotation.x=THREE.MathUtils.lerp(group.current.rotation.x,props.reduced?0:-.025-pointer.y*.14*attention,blend)
    const opacity=props.reduced?1:THREE.MathUtils.clamp(1-distance*.42,.05,1)
    resources.face.opacity=opacity;resources.body.opacity=opacity
  })
  return <group ref={group} position={[index*1.65,index*.12,-index*2.5]}>
    <mesh geometry={resources.frame} material={resources.body}/>
    <mesh geometry={resources.screen} material={resources.face} position={[0,-.08,.101]}/>
    {[-2.5,-2.35,-2.2].map(x=><mesh key={x} position={[x,1.73,.108]}><circleGeometry args={[.025,8]}/><meshBasicMaterial color="#bdbdbd"/></mesh>)}
  </group>
}
function ScreenWorld(props: ScreenSceneProps) {
  const { camera,size,invalidate }=useThree()
  useEffect(()=>{
    const tangent=Math.tan(40*Math.PI/360),aspect=size.width/size.height
    camera.position.set(0,.05,Math.max(3.76/(2*tangent*.88),5.6/(2*tangent*aspect*.86)))
    camera.lookAt(0,0,-.2);camera.updateProjectionMatrix();invalidate()
  },[camera,size.width,size.height,invalidate])
  useEffect(()=>props.position.on('change',()=>{if(props.present)invalidate()}),[props.position,props.present,invalidate])
  return <><StudioLighting low={props.low} monochrome={true}/>{projects.map((project,index)=><ScreenPanel key={project.name} project={project} index={index} {...props}/>)}</>
}
export default function ProjectScreenScene(props: ScreenSceneProps) {
  return <Canvas camera={{position:[0,0,7],fov:40,near:.1,far:40}} dpr={props.low?[1,1.25]:[1,1.5]} frameloop={props.paused||props.reduced?'demand':'always'} gl={{alpha:true,antialias:true,powerPreference:'high-performance'}} aria-label="Объёмные экраны демонстрационных проектов AURA BEAUTY и NEXORA DIGITAL">
    <CanvasHealth onReady={props.onReady} onUnavailable={props.onUnavailable}/><ScreenWorld {...props}/>
  </Canvas>
}
