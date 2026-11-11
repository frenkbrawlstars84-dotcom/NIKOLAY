import { useEffect, useRef } from 'react'
import type { CSSProperties, ReactNode, Ref } from 'react'
import type { ObjectInteraction } from './objectInteraction'

export default function InteractiveSurface({ interaction, reduced, disabled = false, label, hint = 'Нажмите, чтобы изменить форму', className = '', children, ref, style }: {
  interaction: ObjectInteraction; reduced: boolean; disabled?: boolean; label: string; hint?: string
  className?: string; children?: ReactNode; ref?: Ref<HTMLDivElement>; style?: CSSProperties
}) {
  const host = useRef<HTMLDivElement | null>(null), gesture = useRef({ x: 0, y: 0, moved: false, down: false, id: -1, touch: false })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const update = () => {
      const node = host.current
      if (!node) return
      node.dataset.interactionPhase = interaction.phase
      node.setAttribute('aria-disabled', String(disabled || interaction.blocked))
      node.tabIndex=disabled||interaction.blocked?-1:0
    }
    update()
    const unsubscribe = interaction.subscribe(update)
    return () => { unsubscribe(); if (timer.current) clearTimeout(timer.current) }
  }, [interaction, disabled])
  const activate = () => {
    if (disabled || !interaction.activate(reduced)) return
    const node = host.current
    if (!node) return
    node.dataset.feedback = 'true'
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { if (host.current) {host.current.dataset.feedback = 'false';host.current.dataset.hintSeen='true'} }, 650)
  }
  return <div ref={node => { host.current = node; if (typeof ref === 'function') ref(node); else if (ref) ref.current = node }}
    className={`interactive-surface ${className}`} style={style} role="button" tabIndex={disabled ? -1 : 0} aria-label={label} aria-disabled={disabled}
    onPointerEnter={e => { if (!disabled && e.pointerType !== 'touch') interaction.hoverAt(true) }}
    onPointerLeave={() => { if (!gesture.current.down) interaction.hoverAt(false) }}
    onFocus={() => { if (!disabled) interaction.hoverAt(true) }} onBlur={e => {interaction.hoverAt(false);delete e.currentTarget.dataset.input}}
    onPointerDown={e => {
      if (disabled || interaction.blocked || e.button !== 0) return
      e.currentTarget.dataset.input='pointer'
      e.currentTarget.focus({ preventScroll: true })
      gesture.current = { x: e.clientX, y: e.clientY, moved: false, down: true, id: e.pointerId, touch: e.pointerType === 'touch' }
    }}
    onPointerMove={e => {
      if (disabled || interaction.blocked) return
      const rect = e.currentTarget.getBoundingClientRect(), g = gesture.current
      if(!reduced)interaction.point((e.clientX-rect.left)/rect.width*2-1, 1-(e.clientY-rect.top)/rect.height*2)
      if (g.down && g.id === e.pointerId && Math.hypot(e.clientX-g.x, e.clientY-g.y) > 5) {
        g.moved = true
        if (!g.touch) { interaction.yaw += (e.clientX-g.x)*.006; interaction.pitch += (e.clientY-g.y)*.006; g.x=e.clientX; g.y=e.clientY; e.currentTarget.setPointerCapture(e.pointerId);if(reduced)interaction.point(0,0) }
      }
    }}
    onPointerUp={e => { gesture.current.down = false; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId) }}
    onPointerCancel={() => { gesture.current.down=false; gesture.current.moved=true; interaction.hoverAt(false) }}
    onClick={() => { if (!gesture.current.moved) activate(); gesture.current.moved=false }}
    onKeyDown={e => {
      if (disabled || interaction.blocked) return
      e.currentTarget.dataset.input='keyboard'
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!e.repeat) { gesture.current.moved=false; activate() } }
      else if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key)) {
        e.preventDefault()
        if (e.key==='Home') interaction.yaw=interaction.pitch=0
        else if(e.key==='ArrowLeft'||e.key==='ArrowRight') interaction.yaw+=e.key==='ArrowLeft'?-.2:.2
        else interaction.pitch+=e.key==='ArrowUp'?-.2:.2
        interaction.point(interaction.targetX,interaction.targetY)
      }
    }}>
    {children}<span className="interaction-hint" aria-hidden="true">{hint}</span><span className="interaction-aura" aria-hidden="true"/>
  </div>
}
