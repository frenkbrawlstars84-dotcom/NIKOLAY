import { useEffect } from 'react'
import type { RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
export default function useCinematicFlow(root: RefObject<HTMLDivElement | null>, anchor: RefObject<HTMLDivElement | null>, progress: RefObject<number>, reduced: boolean, sceneReady: boolean) {
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
      if (reduced) { progress.current = 0; return }
      const media = gsap.matchMedia()
      if (sceneReady) media.add('(min-height: 651px)', () => {
        if (disposed || !rootElement.isConnected) return
        const copy = rootElement.querySelector<HTMLElement>('.hero-copy')
        if (!copy) return
        const transition = gsap.timeline({
          scrollTrigger: {
            trigger: '.experience-track', start: 'top top', end: 'bottom bottom', scrub: .35,
            invalidateOnRefresh: true,
            onUpdate: self => {
              if (disposed) return
              const hidden = self.progress > .32
              copy.inert = hidden
              if (hidden) copy.setAttribute('aria-hidden', 'true')
              else copy.removeAttribute('aria-hidden')
            },
          },
        })
        transition.to(progress, { current: 1, duration: 1, ease: 'none' }, 0)
          .to('.hero-copy', { xPercent: -6, clipPath: 'inset(0% 100% 0% 0%)', opacity: 0, duration: .16, ease: 'power2.inOut' }, .14)
          .to('.hero-meta,.visual-coordinate', { opacity: 0, duration: .12 }, .21)
          .fromTo('.experience-art', { clipPath: clip }, { clipPath: 'inset(0px 0px 0px 0px)', duration: .12, ease: 'power2.inOut' }, .28)
          .fromTo('.passage-guides', { opacity: 0 }, { opacity: 1, duration: .15 }, .36)
          .fromTo('.passage-meter i', { scaleX: 0 }, { scaleX: 1, duration: .62, ease: 'none' }, .38)
          .fromTo('.ton-caption', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .08 }, .34)
          .to('.ton-caption', { opacity: 0, duration: .035 }, .88)
          .fromTo('.horizon-shade', { opacity: 0 }, { opacity: 1, duration: .025, ease: 'power2.in' }, .918)
          .to('.horizon-shade', { opacity: 0, duration: .05, ease: 'power2.out' }, .95)
          .fromTo('.passage-copy', { clipPath: 'inset(100% 0% 0% 0%)', y: 30 }, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: .05, ease: 'power2.out' }, .95)
          .to('.experience-art', { opacity: 0, duration: .03 }, .97)
        return () => { copy.inert = false; copy.removeAttribute('aria-hidden'); progress.current = 0 }
      })
      gsap.fromTo('.work .section-heading', { y: 65, rotateX: 7 }, { y: 0, rotateX: 0, scrollTrigger: { trigger: '.work', start: 'top 95%', end: 'top 35%', scrub: .35 } })
      gsap.fromTo('.about-body', { y: 75, rotateX: 8, scale: .97 }, { y: 0, rotateX: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'top 35%', scrub: .45 } })
      gsap.fromTo('.about-word', { opacity: .42 }, { opacity: 1, stagger: .08, ease: 'none', scrollTrigger: { trigger: '.about-statement', start: 'top 85%', end: 'bottom 55%', scrub: true } })
      gsap.fromTo('.contact-bottom', { y: 28, opacity: .4 }, { y: 0, opacity: 1, scrollTrigger: { trigger: '.contact', start: 'top 85%', end: 'clamp(top 35%)', scrub: true } })
      return () => media.revert()
    }, root)
    return () => { disposed = true; observer.disconnect(); ctx.revert() }
  }, [root, anchor, progress, reduced, sceneReady])
}
