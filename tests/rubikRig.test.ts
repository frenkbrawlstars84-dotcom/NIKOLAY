import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createRubikRig } from '../src/rubikRig.ts'
import { createCube, commitTurn } from '../src/rubikModel.ts'

function centers(rig: ReturnType<typeof createRubikRig>) {
  rig.root.updateMatrixWorld(true)
  const matrix = new THREE.Matrix4(), point = new THREE.Vector3(), result: string[] = []
  for (const mesh of rig.bodies) for (let i=0; i<mesh.count; i++) {
    mesh.getMatrixAt(i,matrix)
    point.setFromMatrixPosition(matrix).applyMatrix4(mesh.matrixWorld)
    assert([point.x,point.y,point.z].every(v=>Math.abs(v-Math.round(v))<1e-5))
    result.push([point.x,point.y,point.z].map(Math.round).join(','))
  }
  return result.sort()
}
test('temporary layer group rotates nine cubies without uploading instance matrices every frame', () => {
  const cells=createCube(), rig=createRubikRig(cells,true)
  try {
    const move={axis:'y',layer:1,direction:1} as const
    rig.sync(move)
    assert.equal(rig.bodies[0].count,17);assert.equal(rig.bodies[1].count,9)
    assert.equal(rig.stickers[0].count+rig.stickers[1].count,54)
    const versions=[...rig.bodies,...rig.stickers].map(mesh=>mesh.instanceMatrix.version)
    for(let i=0;i<=120;i++)rig.rotate(Math.PI/2*i/120)
    assert.deepEqual([...rig.bodies,...rig.stickers].map(mesh=>mesh.instanceMatrix.version),versions)
    const beforeCommit=centers(rig)
    commitTurn(cells,move);rig.sync()
    assert.deepEqual(centers(rig),beforeCommit,'Finishing a turn causes no visual jump')
    assert.equal(new Set(centers(rig)).size,26)
    assert.equal(rig.bodies[0].count,26);assert.equal(rig.bodies[1].count,0)
    for(const mesh of rig.stickers)assert(mesh.material.color.r>.8&&mesh.material.color.r===mesh.material.color.g&&mesh.material.color.g===mesh.material.color.b)
  } finally {rig.dispose()}
})
test('all axes keep 26 unique centers and 54 white stickers after repeated layer turns',()=>{
  const cells=createCube(),rig=createRubikRig(cells,false),axes=['x','y','z'] as const
  try {
    for(let i=0;i<200;i++){
      const move={axis:axes[i%3],layer:i%2?1:-1,direction:i%3?1:-1} as const
      rig.sync(move);rig.rotate(move.direction*Math.PI/2)
      const before=centers(rig);commitTurn(cells,move);rig.sync()
      assert.deepEqual(centers(rig),before);assert.equal(new Set(before).size,26)
      assert.equal(rig.stickers[0].count+rig.stickers[1].count,54)
    }
  }finally{rig.dispose()}
})
