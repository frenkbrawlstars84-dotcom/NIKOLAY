import * as THREE from 'three'
import { attachMorphTargets } from './morphGeometry.ts'

export function createOrbitalRibbon(low: boolean, width: number) {
  const base: number[] = [], open: number[] = [], passage: number[] = [], uv: number[] = [], indices: number[] = []
  const steps = low ? 72 : 128, q = new THREE.Quaternion(), v = new THREE.Vector3()
  for (let lane=0; lane<5; lane++) {
    const phase=lane*Math.PI*2/5
    q.setFromEuler(new THREE.Euler(lane*.63,.25+lane*.31,lane*.42))
    for(let i=0;i<=steps;i++) for(const side of [-1,1]) {
      const a=i/steps*Math.PI*2, r=1.25+.19*Math.sin(a*3+lane*.8)+side*width
      v.set(Math.cos(a)*r,Math.sin(a)*r,.24*Math.sin(a*2+lane)+side*.08*Math.cos(a*3)).applyQuaternion(q)
      base.push(v.x,v.y,v.z)
      const petal=.83+.1*Math.sin(a*3+lane)+side*width
      v.set(Math.cos(a)*petal,Math.sin(a)*petal,.18*Math.sin(a*2+lane)).applyQuaternion(q)
      open.push(v.x+Math.cos(phase)*1.3,v.y+Math.sin(phase)*1.3,v.z+(lane%2-.5)*.35)
      const radius=1.22+lane*.16+side*width
      passage.push(Math.cos(a)*radius,Math.sin(a)*radius,-lane*1.05+.08*Math.sin(a*3+lane))
      uv.push(i/steps,(side+1)/2)
      if(side===-1&&i<steps){const n=lane*(steps+1)*2+i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2)}
    }
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(base,3))
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals()
  return attachMorphTargets(geometry,[new Float32Array(open),new Float32Array(passage)])
}
