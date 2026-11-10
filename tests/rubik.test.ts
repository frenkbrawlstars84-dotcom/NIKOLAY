import test from 'node:test'
import assert from 'node:assert/strict'
import { createCube, commitTurn, transform, RubikController, selected } from '../src/rubikModel.ts'
import type { Move, Orientation, Vec3 } from '../src/rubikModel.ts'
const identity: Orientation = [1,0,0,0,1,0,0,0,1]
function valid(cells: ReturnType<typeof createCube>) {
  assert.equal(cells.length,26)
  assert.equal(new Set(cells.map(c=>c.position.join(','))).size,26)
  const normals: Vec3[]=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]
  let stickers=0
  for(const cell of cells){
    assert(cell.position.some(v=>v!==0));assert(cell.position.every(v=>Number.isInteger(v)&&Math.abs(v)<=1))
    const m=cell.orientation
    assert.equal(m[0]*(m[4]*m[8]-m[5]*m[7])-m[1]*(m[3]*m[8]-m[5]*m[6])+m[2]*(m[3]*m[7]-m[4]*m[6]),1)
    for(const n of normals){
      if(cell.home.reduce((sum,v,i)=>sum+v*n[i],0)!==1)continue
      const world=transform(m,n)
      assert.equal(cell.position.reduce((sum,v,i)=>sum+v*world[i],0),1,'Sticker stays on an outside face')
      stickers++
    }
  }
  assert.equal(stickers,54)
}
test('26 unique cubies and exactly 54 outside stickers',()=>valid(createCube()))
test('each outer turn moves nine cubies; four quarter turns restore all coordinates and orientations',()=>{
 for(const axis of ['x','y','z'] as const)for(const layer of [-1,1] as const)for(const direction of [-1,1] as const){
  const cells=createCube(),move={axis,layer,direction}
  assert.equal(cells.filter(c=>selected(c,move)).length,9)
  for(let i=0;i<4;i++){commitTurn(cells,move);valid(cells)}
  for(const cell of cells){assert.deepEqual(cell.position,cell.home);assert.deepEqual(cell.orientation,identity)}
 }
})
test('a move followed by its inverse restores the cube',()=>{
 const cells=createCube();commitTurn(cells,{axis:'y',layer:1,direction:1});commitTurn(cells,{axis:'y',layer:1,direction:-1})
 for(const c of cells){assert.deepEqual(c.position,c.home);assert.deepEqual(c.orientation,identity)}
})
test('2,000 mixed turns preserve an integer lattice with no overlap or sticker drift',()=>{
 const cells=createCube();const axes=['x','y','z'] as const
 for(let i=0;i<2000;i++){const move:Move={axis:axes[i%3],layer:i%2?1:-1,direction:i%5?1:-1};commitTurn(cells,move);valid(cells)}
})
test('animated quarter turn commits once, holds its new state, and never rebounds',()=>{
 const model=new RubikController();model.request();model.advance(model.duration / 2,false)
 assert(model.angle>0&&model.angle<Math.PI/2);assert.equal(model.completedTurns,0)
 model.advance(model.duration / 2,false);assert.equal(model.completedTurns,1);assert.equal(model.active,null)
 const committed=JSON.stringify(model.cells);model.advance(10,false);assert.equal(JSON.stringify(model.cells),committed)
 valid(model.cells)
})
test('reduced-motion manual requests snap to complete quarter turns',()=>{
 const model=new RubikController();for(let i=0;i<4;i++)model.request();model.finishPending()
 assert.equal(model.completedTurns,4);assert.equal(model.active,null)
 for(const c of model.cells){assert.deepEqual(c.position,c.home);assert.deepEqual(c.orientation,identity)}
})
