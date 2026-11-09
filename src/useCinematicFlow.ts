import { useEffect } from 'react'
import type { RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
export default function useCinematicFlow(root: RefObject<HTMLDivElement | null>, anchor: RefObject<HTMLDivElement | null>, progress: RefObject<number>, reduced: boolean) {
  useEffect(() => {
    const pin = root.current?.querySelector<HTMLElement>('.experience-pin')
    if (!pin || !anchor.current) return
    const clip = () => {
      const full = pin.getBoundingClientRect(), art = anchor.current!.getBoundingClientRect()
      const top = Math.max(0, art.top - full.top), left = Math.max(0, art.left - full.left)
      const right = Math.max(0, full.right - art.right), bottom = Math.max(0, full.bottom - art.bottom)
      pin.style.setProperty('--intro-clip', `inset(${top}px ${right}px ${bottom}px ${left}px)`)
      pin.style.setProperty('--frame-left', `${left}px`)
      pin.style.setProperty('--frame-top', `${top}px`)
      pin.style.setProperty('--frame-width', `${art.width}px`)
      pin.style.setProperty('--frame-height', `${art.height}px`)
      return `inset(${top}px ${right}px ${bottom}px ${left}px)`
    }
    clip()
    const observer = new ResizeObserver(() => { clip(); ScrollTrigger.refresh() })
    observer.observe(anchor.current)
    const ctx = gsap.context(() => {
      if (reduced) { progress.current = 0; return }
      const media = gsap.matchMedia()
      media.add('(min-height: 651px)', () => {
        const copy = root.current!.querySelector<HTMLElement>('.hero-copy')!
        const transition = gsap.timeline({
          scrollTrigger: {
            trigger: '.experience-track', start: 'top top', end: 'bottom bottom', scrub: .35,
            invalidateOnRefresh: true,
            onUpdate: self => {
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
          .fromTo('.experience-art', { clipPath: clip }, { clipPath: 'inset(0px 0px 0px 0px)', duration: .22, ease: 'power2.inOut' }, .34)
          .fromTo('.passage-guides', { opacity: 0 }, { opacity: 1, duration: .15 }, .36)
          .fromTo('.passage-meter i', { scaleX: 0 }, { scaleX: 1, duration: .62, ease: 'none' }, .38)
          .fromTo('.passage-copy', { clipPath: 'inset(100% 0% 0% 0%)', y: 45 }, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: .17, ease: 'power3.out' }, .79)
          .to('.experience-art', { opacity: .12, duration: .1 }, .9)
        return () => { copy.inert = false; copy.removeAttribute('aria-hidden'); progress.current = 0 }
      })
      gsap.fromTo('.about-body', { y: 75, rotateX: 8, scale: .97 }, { y: 0, rotateX: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'top 35%', scrub: .45 } })
      gsap.fromTo('.about-word', { opacity: .2 }, { opacity: 1, stagger: .08, ease: 'none', scrollTrigger: { trigger: '.about-statement', start: 'top 85%', end: 'bottom 55%', scrub: true } })
      gsap.fromTo('.contact-bottom', { y: 28, opacity: .4 }, { y: 0, opacity: 1, scrollTrigger: { trigger: '.contact', start: 'top 85%', end: 'clamp(top 35%)', scrub: true } })
      return () => media.revert()
    }, root)
    return () => { observer.disconnect(); ctx.revert() }
  }, [root, anchor, progress, reduced])
}
