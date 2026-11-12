import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { TactileMotion } from './tactileMotion'

export default function useTactile(reduced: boolean, label: string, external?: RefObject<HTMLDivElement | null>, available?: () => boolean) {
  const { gl, invalidate } = useThree()
  const motion = useRef(new TactileMotion()), element = useRef<HTMLElement | null>(null)
  const allowed = useRef(available); allowed.current = available
  useEffect(() => {
    const el = external?.current?.querySelector<HTMLElement>('.portal-interaction') ?? gl.domElement
    element.current = el
    let start: { x: number; y: number } | null = null, moved = false
    const down = (e: PointerEvent) => { start = { x: e.clientX, y: e.clientY }; moved = false }
    const move = (e: PointerEvent) => { if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) moved = true }
    const click = () => { if (!moved && (!allowed.current || allowed.current())) { motion.current.toggle(); invalidate() } start = null }
    const enter = () => { motion.current.hovered = true; invalidate() }
    const leave = () => { motion.current.hovered = false; start = null; invalidate() }
    const key = (e: KeyboardEvent) => {
      if (['Enter', ' '].includes(e.key)) { e.preventDefault(); if (!e.repeat) { moved = false; click() } }
      if (e.key === 'Escape') { motion.current.reset(); invalidate() }
    }
    el.tabIndex = 0; el.setAttribute('role', 'button'); el.setAttribute('aria-label', label)
    el.setAttribute('aria-keyshortcuts', 'Enter Space Escape'); el.style.touchAction = 'pan-y'
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('click', click)
    el.addEventListener('pointerenter', enter); el.addEventListener('pointerleave', leave); el.addEventListener('focus', enter); el.addEventListener('blur', leave); el.addEventListener('keydown', key)
    return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('click', click); el.removeEventListener('pointerenter', enter); el.removeEventListener('pointerleave', leave); el.removeEventListener('focus', enter); el.removeEventListener('blur', leave); el.removeEventListener('keydown', key) }
  }, [gl, invalidate, external, label])
  useFrame((_, delta) => {
    const m = motion.current
    if (allowed.current && !allowed.current()) { m.reset(); m.hovered = false }
    const moving = m.step(delta, reduced)
    if (element.current) {
      const el=element.current,morph=m.value.toFixed(3),pressed=String(Boolean(m.target))
      if(el.dataset.interaction!==m.phase)el.dataset.interaction=m.phase
      if(el.dataset.morph!==morph)el.dataset.morph=morph
      if(el.getAttribute('aria-pressed')!==pressed)el.setAttribute('aria-pressed',pressed)
    }
    if (moving && !document.hidden && element.current) {
      const bounds=element.current.getBoundingClientRect()
      if(bounds.bottom>0&&bounds.top<innerHeight)invalidate()
      else m.hovered=false
    }
  }, -2)
  return motion
}
