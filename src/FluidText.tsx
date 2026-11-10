import { useLayoutEffect, useRef } from 'react'
import useReducedMotion from './useReducedMotion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// A wave-shaped reveal and a passing highlight. All masks, filters and
// transforms are removed once complete, leaving sharp, ordinary HTML glyphs.
export default function FluidText({ children }: { children: string }) {
  const root = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()
  useLayoutEffect(() => {
    const element=root.current
    if(!element)return
    if (reduced) {element.dataset.typeReady='true';return()=>{delete element.dataset.typeReady}}
    const ctx = gsap.context(() => {
      const low = matchMedia('(max-width: 900px)').matches || navigator.hardwareConcurrency <= 4
      const timeline=gsap.timeline({scrollTrigger:{trigger:element,start:'top 97%',once:true},onComplete:()=>{
        gsap.set(element.querySelectorAll('.fluid-ink'),{clearProps:'transform,filter,clipPath,willChange'})
        gsap.set(element.querySelectorAll('.fluid-sheen'),{opacity:0,display:'none'})
        if(element.isConnected)element.dataset.typeReady='true'
      }})
      timeline.fromTo('.fluid-ink',{
        clipPath:'polygon(0% 110%,18% 120%,35% 108%,52% 116%,72% 105%,88% 113%,100% 108%,100% 125%,0% 125%)',
        yPercent:24,skewY:3,rotateX:8,filter:low?'blur(.7px)':'blur(1.8px)',willChange:'clip-path,transform',
      },{
        clipPath:'polygon(0% -28%,18% -18%,35% -26%,52% -18%,72% -30%,88% -20%,100% -28%,100% 125%,0% 125%)',
        yPercent:0,skewY:0,rotateX:0,filter:'blur(0px)',duration:1.25,stagger:.085,ease:'power3.out',
      },0).fromTo('.fluid-sheen',{opacity:.7,backgroundPosition:'170% 0%'},{opacity:0,backgroundPosition:'-100% 0%',duration:1.1,stagger:.085,ease:'power2.inOut'},.18)
    }, root)
    return () => {ctx.revert();delete element.dataset.typeReady}
  }, [reduced])
  return <span ref={root} className="fluid-line">{children.split(' ').map((word, i) => <span key={i}><span className="fluid-word"><span className="fluid-ink">{word}<span className="fluid-sheen" aria-hidden="true">{word}</span></span></span>{' '}</span>)}</span>
}
