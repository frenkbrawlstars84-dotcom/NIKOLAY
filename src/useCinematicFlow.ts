import { useEffect } from 'react'
import type { RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { ObjectInteraction } from './objectInteraction'
import { smooth } from './portalJourney'

gsap.registerPlugin(ScrollTrigger)
export default function useCinematicFlow(root: RefObject<HTMLDivElement | null>, anchor: RefObject<HTMLDivElement | null>, reduced: boolean, progress:RefObject<number>, interaction:ObjectInteraction, sceneReady:boolean) {
  useEffect(() => {
    // React StrictMode detaches refs during effect replay. GSAP may evaluate
    // functional tween values while reverting, so never dereference mutable
    // React refs in those callbacks. Retain this effect's DOM nodes instead.
    const rootElement = root.current
    const anchorElement = anchor.current
    const pin = rootElement?.querySelector<HTMLElement>('.experience-pin')
    if (!pin || !anchorElement || !rootElement) return
    let disposed = false
    let lastClip = 'inset(0px 0px 0px 50%)'
    const clip = () => {
      if (disposed || !pin.isConnected || !anchorElement.isConnected) return lastClip
      const full = pin.getBoundingClientRect(), art = anchorElement.getBoundingClientRect()
      const top = Math.max(0, art.top - full.top), left = Math.max(0, art.left - full.left)
      const right = Math.max(0, full.right - art.right), bottom = Math.max(0, full.bottom - art.bottom)
      pin.style.setProperty('--intro-clip', `inset(${top}px ${right}px ${bottom}px ${left}px)`)
      pin.style.setProperty('--frame-left', `${left}px`)
      pin.style.setProperty('--frame-top', `${top}px`)
      pin.style.setProperty('--frame-width', `${art.width}px`)
      pin.style.setProperty('--frame-height', `${art.height}px`)
      lastClip = `inset(${top}px ${right}px ${bottom}px ${left}px)`
      return lastClip
    }
    clip()
    const observer = new ResizeObserver(() => { if (!disposed) { clip(); ScrollTrigger.refresh() } })
    observer.observe(anchorElement)
    const ctx = gsap.context(() => {
      progress.current=0;interaction.setBlocked(false)
      if (reduced) return
      if(sceneReady){
        rootElement.classList.add('journey-enabled')
        gsap.timeline({scrollTrigger:{trigger:'.experience-track',start:'top top',end:'bottom bottom',scrub:.2}}).fromTo('.experience-art',{clipPath:clip},{clipPath:'inset(0px 0px 0px 0px)',ease:'none',duration:.27},.18).to({},{duration:.55},.45)
        gsap.to(progress,{current:1,ease:'none',scrollTrigger:{trigger:'.experience-track',start:'top top',end:'bottom bottom',scrub:.2,onUpdate:self=>{
          interaction.setBlocked(self.progress>.015)
          rootElement.style.setProperty('--hero-art-opacity',String(1-smooth(.8,1,self.progress)))
          const hidden=self.progress>.18
          const copy=rootElement.querySelector<HTMLElement>('.hero-copy')
          if(copy){copy.inert=hidden;copy.style.opacity=String(1-Math.min(1,self.progress/.2));if(hidden)copy.setAttribute('aria-hidden','true');else copy.removeAttribute('aria-hidden')}
          rootElement.style.setProperty('--projects-pointer',self.progress>.72?'auto':'none')
          rootElement.style.setProperty('--projects-arrival',String(Math.max(0,Math.min(1,(self.progress-.72)/.28))))
        }}})
        gsap.to('.hero-meta,.hero-foot,.visual-coordinate',{opacity:0,ease:'none',scrollTrigger:{trigger:'.experience-track',start:'top top',end:'top -25%',scrub:.2}})
      }
      gsap.fromTo('.work .section-heading', { y: 65, rotateX: 7 }, { y: 0, rotateX: 0, scrollTrigger: { trigger: '.work', start: 'top 95%', end: 'top 35%', scrub: .35 } })
      gsap.fromTo('.about-body', { y: 75, rotateX: 8, scale: .97 }, { y: 0, rotateX: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'top 35%', scrub: .45 } })
      gsap.fromTo('.about-word', { opacity: .42 }, { opacity: 1, stagger: .08, ease: 'none', scrollTrigger: { trigger: '.about-statement', start: 'top 85%', end: 'bottom 55%', scrub: true } })
      gsap.fromTo('.contact-bottom', { y: 28, opacity: .4 }, { y: 0, opacity: 1, scrollTrigger: { trigger: '.contact', start: 'top 85%', end: 'clamp(top 35%)', scrub: true } })
    }, root)
    return () => { disposed = true; observer.disconnect(); ctx.revert();rootElement.classList.remove('journey-enabled');progress.current=0;interaction.setBlocked(false);const copy=rootElement.querySelector<HTMLElement>('.hero-copy');if(copy){copy.inert=false;copy.style.opacity='';copy.removeAttribute('aria-hidden')}rootElement.style.removeProperty('--projects-arrival');rootElement.style.removeProperty('--projects-pointer');rootElement.style.removeProperty('--hero-art-opacity') }
  }, [root, anchor, reduced, progress, interaction, sceneReady])
}
