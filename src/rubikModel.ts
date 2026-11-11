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
export const inverseMoves = (moves: readonly Move[]): Move[] => [...moves].reverse().map(move => ({...move,direction:move.direction===1?-1:1}))
export class RubikController {
  cells = createCube()
  active: { move: Move; elapsed: number } | null = null
  queue: Move[] = []
  completedTurns = 0
  completedCycles = 0
  completedCombos = 0
  phase: 'solved' | 'scramble' | 'scrambled' | 'solve' = 'solved'
  readonly duration = .32
  readonly pause = 1.15
  readonly turnPause = .065
  readonly scrambledPause = .42
  comboQueued = false
  private plan: Move[] = []
  private planIndex = 0
  private middle = 0
  private cycle: 'automatic' | 'interaction' | null = null
  private wait = this.pause
  private waiting = 0
  get idle() { return this.waiting }
  get isSolved() { return this.cells.every(cell => cell.position.every((v,i)=>v===cell.home[i]) && cell.orientation.every((v,i)=>v===identity()[i])) }
  request(move: Move = { axis: 'y', layer: 1, direction: 1 }) {
    if (this.queue.length < 8) this.queue.push(move)
  }
  requestCombo() {
    // At most one extra combination, played after the current complete cycle.
    if (this.comboQueued || this.cycle==='interaction') return false
    this.comboQueued=true
    if (!this.cycle && !this.active) { this.wait=0; this.waiting=0 }
    return true
  }
  private beginCycle() {
    const extra=this.comboQueued
    this.comboQueued=false; this.cycle=extra?'interaction':'automatic'
    const scramble=extra?sequence.slice(0,3):sequence
    this.plan=[...scramble,...inverseMoves(scramble)];this.middle=scramble.length;this.planIndex=0
  }
  private completeCycle() {
    if(this.cycle==='interaction')this.completedCombos++
    else this.completedCycles++
    this.plan=[];this.planIndex=0;this.cycle=null;this.phase='solved'
    this.wait=this.comboQueued?.12:this.pause;this.waiting=0
  }
  finishPending() {
    if(this.active){commitTurn(this.cells,this.active.move);this.completedTurns++;this.active=null}
    for(const move of this.queue){commitTurn(this.cells,move);this.completedTurns++}
    this.queue=[]
    if(this.cycle){for(let i=this.planIndex;i<this.plan.length;i++){commitTurn(this.cells,this.plan[i]);this.completedTurns++}this.completeCycle()}
    this.comboQueued=false;this.wait=this.pause;this.waiting=0
  }
  advance(delta: number, automatic = true) {
    if(!Number.isFinite(delta)||delta<=0)return
    let remaining=Math.min(delta,60)
    for(let step=0;step<1024&&remaining>1e-10;step++) {
      if(!this.active) {
        if(this.queue.length)this.active={move:this.queue.shift()!,elapsed:0}
        else {
          if(!automatic)return
          if(this.wait>1e-10){const consumed=Math.min(remaining,this.wait);this.wait-=consumed;this.waiting+=consumed;remaining-=consumed;if(this.wait>1e-10)return}
          if(!this.cycle)this.beginCycle()
          this.phase=this.planIndex<this.middle?'scramble':'solve'
          this.active={move:this.plan[this.planIndex++],elapsed:0};this.waiting=0
        }
      }
      const consumed=Math.min(remaining,this.duration-this.active.elapsed)
      this.active.elapsed+=consumed;remaining-=consumed
      if(this.active.elapsed<this.duration-1e-10)return
      commitTurn(this.cells,this.active.move);this.completedTurns++;this.active=null
      if(this.cycle && this.planIndex===this.plan.length)this.completeCycle()
      else if(this.cycle && this.planIndex===this.middle){this.wait=this.scrambledPause;this.phase='scrambled';this.waiting=0}
      else {this.wait=this.turnPause;this.waiting=0}
    }
  }
  get angle() {
    if(!this.active)return 0
    const t=this.active.elapsed/this.duration
    return t*t*t*(t*(t*6-15)+10)*Math.PI/2*this.active.move.direction
  }
}
