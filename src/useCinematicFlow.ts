import { useEffect } from 'react'
import type { RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
export default function useCinematicFlow(root: RefObject<HTMLDivElement | null>, anchor: RefObject<HTMLDivElement | null>, reduced: boolean) {
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
      if (reduced) return
      gsap.fromTo('.work .section-heading', { y: 65, rotateX: 7 }, { y: 0, rotateX: 0, scrollTrigger: { trigger: '.work', start: 'top 95%', end: 'top 35%', scrub: .35 } })
      gsap.fromTo('.about-body', { y: 75, rotateX: 8, scale: .97 }, { y: 0, rotateX: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'top 35%', scrub: .45 } })
      gsap.fromTo('.about-word', { opacity: .42 }, { opacity: 1, stagger: .08, ease: 'none', scrollTrigger: { trigger: '.about-statement', start: 'top 85%', end: 'bottom 55%', scrub: true } })
      gsap.fromTo('.contact-bottom', { y: 28, opacity: .4 }, { y: 0, opacity: 1, scrollTrigger: { trigger: '.contact', start: 'top 85%', end: 'clamp(top 35%)', scrub: true } })
    }, root)
    return () => { disposed=true;observer.disconnect();ctx.revert() }
  }, [root,anchor,reduced])
}
