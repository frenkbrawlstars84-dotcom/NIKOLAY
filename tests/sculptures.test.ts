import test from 'node:test'
import assert from 'node:assert/strict'
import { createChromeKnot, createGlassCrystal } from '../src/sculptureGeometry.ts'

test('both quality levels produce finite, bounded chrome and glass geometry',()=>{
  for(const low of [true,false])for(const create of [createChromeKnot,createGlassCrystal]){
    const geometry=create(low)
    try{
      for(const attribute of ['position','normal'])assert(Array.from(geometry.attributes[attribute].array).every(Number.isFinite))
      geometry.computeBoundingSphere()
      assert(geometry.boundingSphere!.radius>1&&geometry.boundingSphere!.radius<2)
      assert(geometry.attributes.position.count<10000,'Small sculpture stays within its geometry budget')
    }finally{geometry.dispose()}
  }
})
test('glass refraction volume is closed: every triangle edge has exactly two neighbours',()=>{
  for(const low of [true,false]){
    const geometry=createGlassCrystal(low),positions=geometry.attributes.position
    try{
      const edges=new Map<string,number>()
      const point=(i:number)=>[positions.getX(i),positions.getY(i),positions.getZ(i)].map(v=>v.toFixed(4)).join(',')
      for(let i=0;i<positions.count;i+=3)for(const [a,b] of [[i,i+1],[i+1,i+2],[i+2,i]]){
        const key=[point(a),point(b)].sort().join('|');edges.set(key,(edges.get(key)||0)+1)
      }
      assert([...edges.values()].every(count=>count===2),'No holes or non-manifold seams in the optical volume')
    }finally{geometry.dispose()}
  }
})
