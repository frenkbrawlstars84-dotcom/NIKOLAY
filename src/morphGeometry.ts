import * as THREE from 'three'

export function attachMorphTargets(base: THREE.BufferGeometry, targets: Float32Array[]) {
  base.morphAttributes.position = []
  if (base.getAttribute('normal')) base.morphAttributes.normal = []
  for (const positions of targets) {
    const target = new THREE.BufferGeometry()
    target.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    if (base.index) target.setIndex(base.index)
    base.morphAttributes.position.push(target.getAttribute('position'))
    if (base.getAttribute('normal')) {
      target.computeVertexNormals()
      base.morphAttributes.normal!.push(target.getAttribute('normal'))
    }
    target.dispose()
  }
  base.computeBoundingSphere()
  return base
}
