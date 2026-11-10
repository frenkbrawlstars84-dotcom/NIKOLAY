import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { selected } from './rubikModel.ts'
import type { Cubie, Move } from './rubikModel.ts'

// Two batches share the same geometry/materials. During a turn only the layer
// group's quaternion changes; instance buffers are uploaded at turn boundaries.
export function createRubikRig(cells: Cubie[], low: boolean) {
  const root = new THREE.Group(), stationary = new THREE.Group(), pivot = new THREE.Group()
  root.name = 'rubik-rig'; stationary.name = 'rubik-stationary'; pivot.name = 'rubik-layer'
  root.add(stationary, pivot)
  const body = new RoundedBoxGeometry(.97, .97, .97, low ? 1 : 2, .055)
  const sticker = new RoundedBoxGeometry(.915, .915, .055, low ? 1 : 2, .022)
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: '#080808', metalness: .15, roughness: .3 })
  const stickerMaterial = new THREE.MeshStandardMaterial({ color: '#f5f5f5', metalness: .05, roughness: .22 })
  const bodies = [new THREE.InstancedMesh(body, bodyMaterial, 26), new THREE.InstancedMesh(body, bodyMaterial, 9)]
  const stickers = [new THREE.InstancedMesh(sticker, stickerMaterial, 54), new THREE.InstancedMesh(sticker, stickerMaterial, 27)]
  for (let i = 0; i < 2; i++) {
    const group = i ? pivot : stationary
    group.add(bodies[i], stickers[i])
    for (const mesh of [bodies[i], stickers[i]]) {
      mesh.frustumCulled = false
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    }
  }
  const normals = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]
  const faces = cells.flatMap(cell => normals.flatMap(normal => {
    const n = new THREE.Vector3(normal[0], normal[1], normal[2])
    return cell.home[0]*n.x + cell.home[1]*n.y + cell.home[2]*n.z === 1
      ? [{ cubie: cell.id, normal: n, q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1), n) }] : []
  }))
  const object = new THREE.Object3D(), matrix = new THREE.Matrix4(), axis = new THREE.Vector3()
  const poses = cells.map(() => ({ position: new THREE.Vector3(), q: new THREE.Quaternion(), batch: 0 }))
  let currentMove: Move | null = null
  const sync = (move: Move | null = null) => {
    currentMove = move
    pivot.quaternion.identity()
    axis.set(move?.axis === 'x' ? 1 : 0, move?.axis === 'y' ? 1 : 0, move?.axis === 'z' ? 1 : 0)
    const bodyCounts = [0,0], stickerCounts = [0,0]
    for (const cell of cells) {
      const pose = poses[cell.id], m = cell.orientation
      pose.batch = move && selected(cell, move) ? 1 : 0
      pose.position.set(...cell.position)
      matrix.set(m[0],m[1],m[2],0,m[3],m[4],m[5],0,m[6],m[7],m[8],0,0,0,0,1)
      pose.q.setFromRotationMatrix(matrix)
      object.position.copy(pose.position); object.quaternion.copy(pose.q); object.updateMatrix()
      bodies[pose.batch].setMatrixAt(bodyCounts[pose.batch]++, object.matrix)
    }
    for (const face of faces) {
      const pose = poses[face.cubie]
      object.position.copy(face.normal).multiplyScalar(.502).applyQuaternion(pose.q).add(pose.position)
      object.quaternion.copy(pose.q).multiply(face.q); object.updateMatrix()
      stickers[pose.batch].setMatrixAt(stickerCounts[pose.batch]++, object.matrix)
    }
    for (let i = 0; i < 2; i++) {
      bodies[i].count = bodyCounts[i]; stickers[i].count = stickerCounts[i]
      bodies[i].instanceMatrix.needsUpdate = true; stickers[i].instanceMatrix.needsUpdate = true
    }
    pivot.visible = Boolean(move)
  }
  sync()
  return {
    root, pivot, bodies, stickers, sync,
    get currentMove() { return currentMove },
    rotate(angle: number) { pivot.quaternion.setFromAxisAngle(axis, angle) },
    dispose() {
      for (const mesh of [...bodies, ...stickers]) mesh.dispose()
      body.dispose(); sticker.dispose(); bodyMaterial.dispose(); stickerMaterial.dispose()
    },
  }
}
