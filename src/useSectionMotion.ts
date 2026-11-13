import { useEffect } from 'react'
import type { RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Small content reveals only. No pinned sections, camera travel or hero masks.
export default function useSectionMotion(root: RefObject<HTMLDivElement | null>, reduced: boolean) {
  useEffect(() => {
    if (reduced) return
    const ctx = gsap.context(() => {
      gsap.fromTo('.work .section-heading', { y: 35 }, { y: 0, scrollTrigger: { trigger: '.work', start: 'top 95%', end: 'top 35%', scrub: .35 } })
      gsap.fromTo('.about-body', { y: 45 }, { y: 0, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'top 35%', scrub: .45 } })
      gsap.fromTo('.about-word', { opacity: .42 }, { opacity: 1, stagger: .08, ease: 'none', scrollTrigger: { trigger: '.about-statement', start: 'top 85%', end: 'bottom 55%', scrub: true } })
      gsap.fromTo('.contact-bottom', { y: 28, opacity: .4 }, { y: 0, opacity: 1, scrollTrigger: { trigger: '.contact', start: 'top 85%', end: 'clamp(top 35%)', scrub: true } })
    }, root)
    return () => ctx.revert()
  }, [root, reduced])
}
