export type InteractionPhase = 'idle' | 'hover' | 'active' | 'return'
const ease = (value: number, target: number, rate: number, dt: number) => target + (value-target)*Math.exp(-rate*dt)

// Exact critically damped spring: repeated input preserves position AND velocity.
export class ObjectInteraction {
  value = 0
  velocity = 0
  hover = 0
  hovered = false
  blocked = false
  serial = 0
  time = 0
  yaw = 0
  pitch = 0
  x = 0
  y = 0
  targetX = 0
  targetY = 0
  phase: InteractionPhase = 'idle'
  private hold = 0
  private pointerTime = -Infinity
  private listeners = new Set<() => void>()
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private publish() { this.listeners.forEach(listener => listener()) }
  private updatePhase() {
    const next = this.hold > 0 ? 'active' : this.value > .001 || Math.abs(this.velocity) > .005 ? 'return' : this.hovered && !this.blocked ? 'hover' : 'idle'
    if (next !== this.phase) { this.phase = next; this.publish() }
  }
  setBlocked(blocked: boolean) {
    if (blocked === this.blocked) return
    this.blocked = blocked
    if (blocked) this.hold = 0
    this.updatePhase(); this.publish()
  }
  point(x: number, y: number) { this.targetX = x; this.targetY = y; this.pointerTime=this.time; this.publish() }
  hoverAt(hovered: boolean) { this.hovered = hovered; if (!hovered) this.targetX = this.targetY = 0; this.updatePhase(); this.publish() }
  activate(reduced = false) {
    if (this.blocked) return false
    this.serial++
    if (!reduced) this.hold = 1.35
    this.updatePhase(); this.publish()
    return true
  }
  settle() { this.value=this.velocity=this.hold=0; this.updatePhase() }
  advance(dt: number) {
    if (!Number.isFinite(dt) || dt <= 0) return
    this.time += dt
    this.hover = ease(this.hover, this.hovered && !this.blocked ? 1 : 0, 6, dt)
    const activity=Math.exp(-Math.max(0,this.time-this.pointerTime-.4)*2)
    this.x = ease(this.x, this.blocked ? 0 : this.targetX*activity, 6, dt)
    this.y = ease(this.y, this.blocked ? 0 : this.targetY*activity, 6, dt)
    // Split exactly at the end of the hold, including irregular/slow frames.
    let remaining = dt
    while (remaining > 1e-10) {
      const step = this.hold > 0 ? Math.min(this.hold, remaining) : remaining
      const target = this.hold > 0 ? 1 : 0, offset = this.value-target, rate = 8
      const c = this.velocity+rate*offset, decay = Math.exp(-rate*step)
      this.value = target+(offset+c*step)*decay
      this.velocity = (this.velocity-rate*c*step)*decay
      this.hold = Math.max(0, this.hold-step); remaining -= step
    }
    if (this.value < .00001 && Math.abs(this.velocity) < .00005) this.value = this.velocity = 0
    this.updatePhase()
  }
}
