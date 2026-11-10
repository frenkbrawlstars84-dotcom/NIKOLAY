import * as THREE from 'three'

class SilverKnotCurve extends THREE.Curve<THREE.Vector3> {
  constructor() { super() }
  getPoint(t: number, target = new THREE.Vector3()) {
    const a = t * Math.PI * 2, radius = 1 + .24 * Math.cos(a * 3)
    return target.set(radius * Math.cos(a * 2), radius * Math.sin(a * 2), .54 * Math.sin(a * 3))
  }
}
export function createChromeKnot(low: boolean) {
  const segments = low ? 100 : 220, radial = low ? 8 : 16
  const geometry = new THREE.TubeGeometry(new SilverKnotCurve(), segments, .23, radial, true)
  const positions = geometry.attributes.position, normals = geometry.attributes.normal
  for (let i=0; i<positions.count; i++) {
    const t = Math.floor(i / (radial + 1)) / segments
    const offset = .028 * Math.sin(t * Math.PI * 10)
    positions.setXYZ(i, positions.getX(i) + normals.getX(i)*offset, positions.getY(i) + normals.getY(i)*offset, positions.getZ(i) + normals.getZ(i)*offset)
  }
  geometry.computeVertexNormals(); geometry.computeBoundingSphere()
  return geometry
}
export function createGlassCrystal(low: boolean) {
  const sides = low ? 9 : 12
  const levels = [[-1.4,.28],[-1,.75],[-.3,1.08],[.42,.96],[1.05,.62],[1.42,.21]]
  const positions: number[] = [], indices: number[] = []
  levels.forEach(([y,radius], level) => {
    for (let side=0; side<sides; side++) {
      const a = side / sides * Math.PI * 2 + level * .19
      const r = radius * (1 + .06 * Math.sin(side*3 + level*1.7))
      positions.push(Math.cos(a)*r, y, Math.sin(a)*r)
    }
  })
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), normal = new THREE.Vector3(), center = new THREE.Vector3()
  const triangle = (i: number,j: number,k: number) => {
    a.fromArray(positions,i*3); b.fromArray(positions,j*3); c.fromArray(positions,k*3)
    center.copy(a).add(b).add(c); normal.subVectors(b,a).cross(c.sub(a))
    if (normal.dot(center) < 0) indices.push(i,k,j); else indices.push(i,j,k)
  }
  for (let level=0; level<levels.length-1; level++) for (let side=0; side<sides; side++) {
    const next=(side+1)%sides, base=level*sides, top=base+sides
    triangle(base+side,base+next,top+side); triangle(base+next,top+next,top+side)
  }
  const bottom=positions.length/3; positions.push(0,-1.53,0)
  const top=positions.length/3; positions.push(0,1.55,0)
  for (let side=0; side<sides; side++) {
    triangle(bottom,side,(side+1)%sides)
    triangle(top,(levels.length-1)*sides+side,(levels.length-1)*sides+(side+1)%sides)
  }
  const indexed=new THREE.BufferGeometry()
  indexed.setAttribute('position',new THREE.Float32BufferAttribute(positions,3)); indexed.setIndex(indices)
  const geometry=indexed.toNonIndexed(); indexed.dispose()
  geometry.computeVertexNormals(); geometry.computeBoundingSphere()
  return geometry
}
