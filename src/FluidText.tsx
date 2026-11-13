import { useLayoutEffect, useRef } from 'react'
import useReducedMotion from './useReducedMotion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Keep the complete glyph visible throughout a short rise and highlight.
// No word-level crop, blur, polygon mask or scroll-dependent opacity.
export default function FluidText({ children }: { children: string }) {
  const root=useRef<HTMLSpanElement>(null)
  const reduced=useReducedMotion()
  useLayoutEffect(()=>{
    const element=root.current
    if(!element)return
    if(reduced){element.dataset.typeReady='true';return()=>{delete element.dataset.typeReady}}
    let deadline:number|undefined
    const ctx=gsap.context(()=>{
      const complete=()=>{
        clearTimeout(deadline)
        gsap.set(element.querySelectorAll('.fluid-ink'),{clearProps:'transform,opacity,willChange'})
        gsap.set(element.querySelectorAll('.fluid-sheen'),{opacity:0,display:'none'})
        element.dataset.typeReady='true'
      }
      const timeline=gsap.timeline({paused:true,onComplete:complete})
      timeline.fromTo('.fluid-ink',{y:6,opacity:.85,willChange:'transform'},{y:0,opacity:1,duration:.35,stagger:.025,ease:'power2.out'},0)
        .fromTo('.fluid-sheen',{opacity:.25,backgroundPosition:'150% 0%'},{opacity:0,backgroundPosition:'-80% 0%',duration:.4},0)
      ScrollTrigger.create({trigger:element,start:'top 115%',end:'bottom top',once:true,onEnter:()=>{timeline.play();deadline=window.setTimeout(()=>timeline.progress(1),440)},onLeave:()=>timeline.progress(1)})
    },root)
    return()=>{clearTimeout(deadline);ctx.revert();delete element.dataset.typeReady}
  },[reduced])
  return <span ref={root} className="fluid-line">{children.split(' ').map((word,i)=><span key={i}><span className="fluid-word"><span className="fluid-ink">{word}<span className="fluid-sheen" aria-hidden="true">{word}</span></span></span>{' '}</span>)}</span>
}
