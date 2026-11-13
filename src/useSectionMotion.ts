import { useEffect } from 'react'
import type { RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
export default function useSectionMotion(root: RefObject<HTMLDivElement | null>, reduced: boolean) {
  useEffect(()=>{
    if(reduced)return
    const ctx=gsap.context(()=>{
      for(const selector of ['.work .section-heading','.about-body','.contact-bottom']){
        const element=root.current?.querySelector(selector)
        if(!element)continue
        const tween=gsap.fromTo(element,{y:12},{y:0,duration:.4,paused:true,ease:'power2.out',onComplete:()=>{gsap.set(element,{clearProps:'transform'})}})
        ScrollTrigger.create({trigger:element,start:'top 115%',end:'bottom top',once:true,onEnter:()=>tween.play(),onLeave:()=>tween.progress(1)})
      }
    },root)
    return()=>ctx.revert()
  },[root,reduced])
}
