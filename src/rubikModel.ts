export type Axis = 'x' | 'y' | 'z'
export type Vec3 = [number, number, number]
export type Orientation = [number, number, number, number, number, number, number, number, number]
export type Move = { axis: Axis; layer: -1 | 0 | 1; direction: -1 | 1 }
export type Cubie = { id: number; home: Vec3; position: Vec3; orientation: Orientation }
const identity = (): Orientation => [1, 0, 0, 0, 1, 0, 0, 0, 1]
export function createCube(): Cubie[] {
  const cells: Cubie[] = []
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    if (x || y || z) cells.push({ id: cells.length, home: [x, y, z], position: [x, y, z], orientation: identity() })
  }
  return cells
}
export function transform(m: Orientation, v: Vec3): Vec3 {
  return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]].map(value => value === 0 ? 0 : value) as Vec3
}
export function selected(cell: Cubie, move: Move) { return cell.position[move.axis === 'x' ? 0 : move.axis === 'y' ? 1 : 2] === move.layer }
export function commitTurn(cells: Cubie[], move: Move) {
  const d = move.direction
  const rotation: Orientation = move.axis === 'x' ? [1, 0, 0, 0, 0, -d, 0, d, 0] : move.axis === 'y' ? [0, 0, d, 0, 1, 0, -d, 0, 0] : [0, -d, 0, d, 0, 0, 0, 0, 1]
  for (const cell of cells) {
    if (!selected(cell, move)) continue
    cell.position = transform(rotation, cell.position)
    const result = identity()
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) result[r * 3 + c] = rotation[r * 3] * cell.orientation[c] + rotation[r * 3 + 1] * cell.orientation[3 + c] + rotation[r * 3 + 2] * cell.orientation[6 + c]
    cell.orientation = result.map(value => value === 0 ? 0 : value) as Orientation
  }
}
const sequence: Move[] = [
  { axis: 'y', layer: 1, direction: 1 }, { axis: 'x', layer: 1, direction: -1 }, { axis: 'z', layer: -1, direction: 1 },
  { axis: 'y', layer: -1, direction: -1 }, { axis: 'x', layer: -1, direction: 1 }, { axis: 'z', layer: 1, direction: -1 },
]
export class RubikController {
  cells = createCube()
  active: { move: Move; elapsed: number } | null = null
  queue: Move[] = []
  completedTurns = 0
  idle = 0
  sequenceIndex = 0
  readonly duration = 1.8
  readonly pause = 6.5
  request(move: Move = { axis: 'y', layer: 1, direction: 1 }) {
    if (this.queue.length < 8) this.queue.push(move)
  }
  finishPending() {
    if (this.active) { commitTurn(this.cells, this.active.move); this.completedTurns++; this.active = null }
    for (const move of this.queue) { commitTurn(this.cells, move); this.completedTurns++ }
    this.queue.length = 0; this.idle = 0
  }
  advance(delta: number, automatic = true) {
    if (!Number.isFinite(delta) || delta <= 0) return
    let remaining = Math.min(delta, 60)
    // Consume only the time belonging to each phase. Carry the remainder
    // across boundaries so irregular frame intervals cannot shift or jump turns.
    for (let step=0; step<32 && remaining>1e-10; step++) {
      if (!this.active) {
        if (this.queue.length) this.active = { move: this.queue.shift()!, elapsed: 0 }
        else if (automatic) {
          const consumed=Math.min(remaining,this.pause-this.idle)
          this.idle+=consumed; remaining-=consumed
          if(this.idle<this.pause-1e-10)return
          this.active={move:sequence[this.sequenceIndex++ % sequence.length],elapsed:0};this.idle=0
        } else return
      }
      const consumed=Math.min(remaining,this.duration-this.active.elapsed)
      this.active.elapsed+=consumed;remaining-=consumed
      if(this.active.elapsed<this.duration-1e-10)return
      commitTurn(this.cells,this.active.move);this.completedTurns++;this.active=null;this.idle=0
    }
  }
  get angle() {
    if (!this.active) return 0
    const t = this.active.elapsed / this.duration
    return t * t * t * (t * (t * 6 - 15) + 10) * Math.PI / 2 * this.active.move.direction
  }
}
