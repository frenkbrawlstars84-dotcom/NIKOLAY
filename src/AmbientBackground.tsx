import { useEffect, useRef } from 'react'
import { useSceneBusy } from './useSceneBudget'

// A single 2D composited sky: generated cloud textures, three star depths, no downloads.
export default function AmbientBackground({ reduced, paused }: { reduced: boolean; paused: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const busy=useSceneBusy(),focus=useRef(busy),wake=useRef<(()=>void)|null>(null)
  focus.current=busy
  useEffect(()=>{wake.current?.()},[busy])
  useEffect(() => {
    const element = canvas.current
    const ctx = element?.getContext('2d')
    if (!element || !ctx) return
    let width = 0, height = 0, frame = 0, last = 0, time = 0, low = false
    const pointer = { x: 0, y: 0 }, drift = { x: 0, y: 0 }
    let seed = 48271
    const random = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646 }
    const stars = Array.from({ length: 150 }, () => ({ x: random(), y: random(), depth: .25 + random() * .75, phase: random() * Math.PI * 2, size: .3 + random() * .9 }))
    const cloud = (rgb: number[], offset: number) => {
      const size = 192, texture = document.createElement('canvas')
      texture.width = texture.height = size
      const paint = texture.getContext('2d')!
      const pixels = paint.createImageData(size, size)
      const grids = [3, 6, 12, 24].map(n => ({ n, values: Array.from({ length: (n + 1) ** 2 }, random) }))
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const nx = x / size, ny = y / size
        let noise = 0, amplitude = .55
        for (const { n, values } of grids) {
          const gx = nx * n, gy = ny * n, ix = Math.floor(gx), iy = Math.floor(gy)
          const fx = gx - ix, fy = gy - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
          const a = values[iy * (n + 1) + ix], b = values[iy * (n + 1) + ix + 1]
          const c = values[(iy + 1) * (n + 1) + ix], d = values[(iy + 1) * (n + 1) + ix + 1]
          noise += ((a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy) * amplitude
          amplitude *= .5
        }
        const edge = Math.max(0, 1 - Math.hypot((nx - .5) * 2, (ny - .5) * 2))
        const ridge = Math.max(0, 1 - Math.abs(ny - .5 + Math.sin(nx * 5 + offset) * .15) * 3)
        const i = (y * size + x) * 4
        pixels.data[i] = rgb[0]; pixels.data[i + 1] = rgb[1]; pixels.data[i + 2] = rgb[2]
        pixels.data[i + 3] = Math.min(140, Math.pow(noise, 1.45) * edge * ridge * 300)
      }
      paint.putImageData(pixels, 0, 0)
      return texture
    }
    const blueCloud = cloud([77, 103, 145], .4), violetCloud = cloud([109, 122, 149], 1.8)
    // Cached spiral/star-cluster sprites; no extra WebGL context or downloads.
    const galaxy=document.createElement('canvas');galaxy.width=galaxy.height=384
    const g=galaxy.getContext('2d')!
    const halo=g.createRadialGradient(192,192,2,192,192,170)
    halo.addColorStop(0,'#bacce54d');halo.addColorStop(.18,'#91b2e11c');halo.addColorStop(1,'#668bc900')
    g.fillStyle=halo;g.fillRect(0,0,384,384)
    for(let i=0;i<1500;i++){
      const r=Math.sqrt(random())*166,a=r*.041+(i%2)*Math.PI+(random()-.5)*.55
      const x=192+Math.cos(a)*r,y=192+Math.sin(a)*r
      g.fillStyle=`rgba(181,204,238,${.12+random()*.32})`;g.fillRect(x,y,.4+random()*.9,.4+random()*.9)
    }
    const clusters=Array.from({length:3},(_,i)=>({x:i%2?.09:.89,y:.16+i*.31,depth:.2+i*.16}))
    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      if (!reduced && !paused) { drift.x += (pointer.x - drift.x) * .035; drift.y += (pointer.y - drift.y) * .035 }
      const scroll = reduced ? 0 : window.scrollY * .00012
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.translate(width * .76 + Math.sin(time * .035 + scroll) * 30 + drift.x * 15, height * .43 + drift.y * 10)
      ctx.rotate(-.35 + Math.sin(time * .02) * .08)
      ctx.globalAlpha = low ? .7 : .95
      ctx.drawImage(blueCloud, -width * .49, -height * .68, width * 1.06, height * 1.5)
      if (!low) {
        ctx.rotate(.8)
        ctx.globalAlpha = .36
        ctx.drawImage(violetCloud, -width * .6, -height * .15, width * .85, height * 1.1)
      }
      ctx.restore()
      for(let i=0;i<(low?2:3);i++){
        const cluster=clusters[i],size=Math.min(width*.3,330)
        const y=((cluster.y*height-scroll*cluster.depth*45)%(height+size)+height+size)%(height+size)-size*.25
        ctx.save();ctx.translate(width*cluster.x+drift.x*6,y);ctx.rotate(.4+i*1.4+(reduced?0:time*.006));ctx.scale(1,.46)
        ctx.globalAlpha=low?.28:.4;ctx.drawImage(galaxy,-size/2,-size/2,size,size);ctx.restore()
      }
      const count = low ? 75 : stars.length
      for (let i = 0; i < count; i++) {
        const s = stars[i], parallax = reduced ? 0 : scroll * s.depth * 30
        const x = (s.x * width + drift.x * s.depth * 18 + Math.sin(time * .015 + s.phase) * 3 + width) % width
        const y = (s.y * height - parallax + drift.y * s.depth * 12 + height * 10) % height
        const centerShield = x > width * .15 && x < width * .59 ? .4 : 1
        const twinkle = reduced ? .8 : .72 + Math.sin(time * .25 + s.phase) * .18
        ctx.fillStyle = `rgba(220,222,226,${(.16 + s.depth * .45) * twinkle * centerShield})`
        ctx.beginPath(); ctx.arc(x, y, s.size * (low ? .8 : 1), 0, Math.PI * 2); ctx.fill()
        if (!low && i % 31 === 0) {
          ctx.strokeStyle = `rgba(215,218,224,${.09 * twinkle})`; ctx.lineWidth = .5
          ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); ctx.stroke()
        }
      }
      // Peripheral light paths reinforce depth while leaving the reading column dark.
      for (let i = 0; i < (low ? 2 : 4); i++) {
        const x = width * .94 + i * 16, bend = Math.sin(time * .04 + i + scroll) * 35
        ctx.strokeStyle = 'rgba(176,184,196,.045)'; ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(x + 60, -40)
        ctx.bezierCurveTo(x - 130 + bend, height * .3, x + 110, height * .6, x - 130, height + 40); ctx.stroke()
      }
    }
    const resize = () => {
      width = innerWidth; height = innerHeight
      low = width <= 900 || navigator.hardwareConcurrency <= 4
      const dpr = low ? 1 : Math.min(devicePixelRatio, 1.25)
      element.width = Math.round(width * dpr); element.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw()
    }
    const tick = (now: number) => {
      if (document.hidden || focus.current) { frame = 0; return }
      if (now - last >= (low ? 83 : 40)) { time += Math.min((now - last) / 1000, .15); last = now; draw() }
      frame = requestAnimationFrame(tick)
    }
    const visibility = () => {
      cancelAnimationFrame(frame)
      if (!document.hidden && !reduced && !paused && !focus.current) { last = performance.now(); frame = requestAnimationFrame(tick) }
    }
    const move = (e: PointerEvent) => { if (!reduced && !paused && e.pointerType !== 'touch') { pointer.x = e.clientX / width - .5; pointer.y = e.clientY / height - .5 } }
    wake.current=visibility
    resize(); visibility()
    window.addEventListener('resize', resize, { passive: true }); window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('visibilitychange', visibility)
    return () => {wake.current=null;cancelAnimationFrame(frame); window.removeEventListener('resize', resize); window.removeEventListener('pointermove', move); document.removeEventListener('visibilitychange', visibility) }
  }, [reduced, paused])
  return <canvas className="ambient-background" ref={canvas} aria-hidden="true" />
}
