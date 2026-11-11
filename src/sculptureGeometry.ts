import * as THREE from 'three'
import { attachMorphTargets } from './morphGeometry.ts'

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
  geometry.computeVertexNormals()
  const openCurve = new class extends THREE.Curve<THREE.Vector3> {
    constructor() { super() }
    getPoint(t: number, target = new THREE.Vector3()) {
      const a=t*Math.PI*2,r=1.34+.16*Math.cos(a*3)
      return target.set(Math.cos(a)*r,Math.sin(a)*r*.86,.45*Math.sin(a*3))
    }
  }()
  const open = new THREE.TubeGeometry(openCurve,segments,.23,radial,true)
  attachMorphTargets(geometry,[new Float32Array(open.attributes.position.array)])
  open.dispose()
  return geometry
}

// Closed radial wedges. Every shard has interior walls; the target is baked
// once, and the GPU interpolates it with a single shared morph influence.
export function createGlassShards(low: boolean) {
  const sides=low?9:12, levels=[[-1.53,0],[-1.4,.28],[-1,.75],[-.3,1.08],[.42,.96],[1.05,.62],[1.42,.21],[1.55,0]]
  const positions:number[]=[],targets:number[]=[],lines:number[]=[],lineTargets:number[]=[],interiors:number[]=[]
  const ranges:{start:number;count:number}[]=[]
  const ab=new THREE.Vector3(),ac=new THREE.Vector3(),normal=new THREE.Vector3(),center=new THREE.Vector3()
  for(let side=0;side<sides;side++) {
    const start=positions.length/3
    const angle=(side+.5)/sides*Math.PI*2+.6,direction=new THREE.Vector3(Math.cos(angle),0,Math.sin(angle))
    const pivot=direction.clone().multiplyScalar(.53),q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(-direction.z,.35,direction.x).normalize(),side%2?.24:-.24)
    const offset=direction.clone().multiplyScalar(.66);offset.y=(side%3-1)*.22
    const target=(v:THREE.Vector3)=>v.clone().sub(pivot).applyQuaternion(q).add(pivot).add(offset)
    const ring=levels.map(([y,r],level)=>{
      const a=side/sides*Math.PI*2+Math.max(0,level-1)*.19,b=a+Math.PI*2/sides
      return [new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r),new THREE.Vector3(Math.cos(b)*r,y,Math.sin(b)*r),new THREE.Vector3(0,y,0)]
    })
    const triangle=(a:THREE.Vector3,b:THREE.Vector3,c:THREE.Vector3,interior=0)=>{
      normal.copy(ab.subVectors(b,a)).cross(ac.subVectors(c,a));center.copy(a).add(b).add(c).multiplyScalar(1/3).sub(pivot)
      const vertices=normal.dot(center)<0?[a,c,b]:[a,b,c]
      for(const v of vertices){positions.push(v.x,v.y,v.z);interiors.push(interior);const t=target(v);targets.push(t.x,t.y,t.z)}
    }
    const line=(a:THREE.Vector3,b:THREE.Vector3)=>{for(const v of [a,b]){lines.push(v.x,v.y,v.z);const t=target(v);lineTargets.push(t.x,t.y,t.z)}}
    for(let level=0;level<ring.length-1;level++) {
      const [l,r,c]=ring[level],[ll,rr,cc]=ring[level+1]
      if(level>0) {triangle(l,r,ll);triangle(l,ll,c,1);triangle(r,c,rr,1)}
      if(level<ring.length-2) {triangle(r,rr,ll);triangle(ll,cc,c,1);triangle(rr,c,cc,1)}
      line(l,ll);line(r,rr)
      if(level>0)line(l,r)
    }
    ranges.push({start,count:positions.length/3-start})
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals()
  geometry.setAttribute('aInterior',new THREE.Float32BufferAttribute(interiors,1))
  for(const range of ranges)geometry.addGroup(range.start,range.count,0)
  attachMorphTargets(geometry,[new Float32Array(targets)])
  const edges=new THREE.BufferGeometry();edges.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));attachMorphTargets(edges,[new Float32Array(lineTargets)])
  return {geometry,edges}
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
