import { useEffect, useRef } from 'react'

// One lightweight 2D layer for the entire page, instead of another WebGL context.
export default function AmbientBackground({ reduced, paused }: { reduced: boolean; paused: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const element = canvas.current
    const ctx = element?.getContext('2d')
    if (!element || !ctx) return

    let width = 0, height = 0, frame = 0, last = 0, time = 0
    let low = false
    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      low = width < 900 || navigator.hardwareConcurrency <= 4
      const dpr = low ? 1 : Math.min(devicePixelRatio, 1.25)
      element.width = Math.round(width * dpr)
      element.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw()
    }
    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      const count = low ? 12 : 30
      // Keep the central reading column clear; particles stay at the margins.
      for (let i = 0; i < count; i++) {
        const edge = i % 2 ? .88 : .02
        const x = width * (edge + ((i * .618) % .09)) + Math.sin(time * .13 + i) * 8
        const y = (((i * .137) % 1) * height + time * (2 + i % 3)) % (height + 20) - 10
        ctx.fillStyle = `rgba(192, 203, 221, ${.13 + (i % 3) * .045})`
        ctx.beginPath()
        ctx.arc(x, y, i % 4 === 0 ? 1.2 : .65, 0, Math.PI * 2)
        ctx.fill()
      }
      const scroll = reduced ? 0 : window.scrollY * .0003
      for (let i = 0; i < (low ? 3 : 6); i++) {
        const drift = reduced ? 0 : Math.sin(time * .075 + i * .18 + scroll) * 35
        const x = width * .91 + i * 16
        ctx.strokeStyle = `rgba(170, 186, 211, ${.035 + i * .005})`
        ctx.lineWidth = .6
        ctx.beginPath()
        ctx.moveTo(x + 90, -50)
        ctx.bezierCurveTo(x - 170 + drift, height * .25, x + 150, height * .65, x - 140 + drift, height + 50)
        ctx.stroke()
      }
    }
    const tick = (now: number) => {
      if (document.hidden) { frame = 0; return }
      if (now - last >= (low ? 66 : 40)) {
        time += Math.min((now - last) / 1000, .1)
        last = now
        draw()
      }
      frame = requestAnimationFrame(tick)
    }
    const visibility = () => {
      cancelAnimationFrame(frame)
      if (!document.hidden && !reduced && !paused) {
        last = performance.now()
        frame = requestAnimationFrame(tick)
      }
    }
    resize()
    visibility()
    window.addEventListener('resize', resize, { passive: true })
    document.addEventListener('visibilitychange', visibility)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [reduced, paused])

  return <canvas className="ambient-background" ref={canvas} aria-hidden="true" />
}
