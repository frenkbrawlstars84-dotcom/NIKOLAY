export type InteractionPhase = 'IDLE' | 'HOVER' | 'ACTIVE' | 'RETURN'
// One reversible spring owns the shape; a second click changes its destination,
// never starts a competing animation or resets its current velocity.
export class TactileMotion {
  target = 0
  value = 0
  velocity = 0
  hover = 0
  hovered = false
  flash = 0
  phase: InteractionPhase = 'IDLE'
  toggle() { this.target = 1 - this.target; this.flash = 1 }
  reset() { this.target = 0 }
  step(delta: number, reduced = false) {
    const dt = Math.min(Math.max(delta, 0), .05)
    if (reduced) { this.value = this.target; this.velocity = 0; this.hover = 0; this.flash = 0 }
    else {
      // Substeps keep the damped spring stable across slow frames.
      const steps = Math.max(1, Math.ceil(dt / .008)), h = dt / steps
      for (let i = 0; i < steps; i++) {
        this.velocity += ((this.target - this.value) * 75 - this.velocity * 17) * h
        this.value += this.velocity * h
      }
      this.hover += ((this.hovered ? 1 : 0) - this.hover) * (1 - Math.exp(-dt * 9))
      this.flash *= Math.exp(-dt * 7)
    }
    if (Math.abs(this.target - this.value) < .0005 && Math.abs(this.velocity) < .003) { this.value = this.target; this.velocity = 0 }
    this.phase = this.target ? 'ACTIVE' : this.value > .0005 ? 'RETURN' : this.hovered ? 'HOVER' : 'IDLE'
    if(reduced)return false
    return Math.abs(this.target - this.value) > .0005 || Math.abs(this.hover - (this.hovered ? 1 : 0)) > .001 || this.flash > .002
  }
}
