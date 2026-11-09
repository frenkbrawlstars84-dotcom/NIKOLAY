import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// A one-time masked, softly distorted reveal. The settled text is ordinary HTML.
export default function FluidText({ children }: { children: string }) {
  const root = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()
  useEffect(() => {
    if (reduced) return
    const ctx = gsap.context(() => {
      const low = matchMedia('(max-width: 900px)').matches || navigator.hardwareConcurrency <= 4
      gsap.fromTo('.fluid-ink', {
        yPercent: 112, rotateX: -55, skewY: 5, filter: low ? 'none' : 'blur(5px)',
      }, {
        yPercent: 0, rotateX: 0, skewY: 0, filter: low ? 'none' : 'blur(0px)',
        duration: 1.15, stagger: .07, ease: 'power3.out',
        scrollTrigger: { trigger: root.current, start: 'top 96%', once: true },
      })
    }, root)
    return () => ctx.revert()
  }, [reduced])
  return <span ref={root} className="fluid-line">{children.split(' ').map((word, i) => <span key={i}><span className="fluid-word"><span className="fluid-ink">{word}</span></span>{' '}</span>)}</span>
}
