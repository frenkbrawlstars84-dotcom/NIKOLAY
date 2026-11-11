import test from 'node:test'
import assert from 'node:assert/strict'
import { ObjectInteraction } from '../src/objectInteraction.ts'
import { createOrbitalRibbon } from '../src/orbitalGeometry.ts'
import { createGlassShards } from '../src/sculptureGeometry.ts'
import { portalJourney } from '../src/portalJourney.ts'

test('repeated activation preserves position/velocity and eventually returns exactly to rest',()=>{
 const p=new ObjectInteraction();p.activate();p.advance(.63)
 const before=[p.value,p.velocity];p.activate();assert.deepEqual([p.value,p.velocity],before)
 for(let i=0;i<30;i++){p.advance(.013);p.activate()}
 assert(p.value<=1&&p.value>.8)
 p.advance(5);assert.equal(p.value,0);assert.equal(p.phase,'idle')
})
test('spring consumes hold boundaries consistently at 12/30/60/144 FPS',()=>{
 const reference=new ObjectInteraction();reference.activate();reference.advance(2.31)
 for(const fps of [12,30,60,144]){
  const p=new ObjectInteraction();p.activate();const frames=Math.floor(2.31*fps)
  for(let i=0;i<frames;i++)p.advance(1/fps)
  p.advance(2.31-frames/fps)
  assert(Math.abs(p.value-reference.value)<1e-9);assert(Math.abs(p.velocity-reference.velocity)<1e-9)
 }
})
test('scroll lock suppresses input, cancels the hold smoothly and reduced motion settles',()=>{
 const p=new ObjectInteraction();p.activate();p.advance(.4);const value=p.value
 p.setBlocked(true);assert.equal(p.activate(),false);assert.equal(p.value,value)
 p.advance(3);assert.equal(p.value,0);p.setBlocked(false);assert(p.activate());p.settle();assert.equal(p.value,0)
 const serial=p.serial;p.activate(true);p.advance(1);assert.equal(p.serial,serial+1);assert.equal(p.value,0)
})
test('hero base, opening and scroll passage reuse finite, matching morph geometry',()=>{
 for(const low of [false,true])for(const width of [.15,.008]){
  const g=createOrbitalRibbon(low,width)
  try{
   const base=g.attributes.position
   assert.equal(g.morphAttributes.position!.length,2)
   for(const target of g.morphAttributes.position!){assert.equal(target.count,base.count);assert(Array.from(target.array).every(Number.isFinite));assert(target.array.some((v,i)=>Math.abs(v-base.array[i])>.1))}
   for(const normal of g.morphAttributes.normal!)assert(Array.from(normal.array).every(Number.isFinite))
  }finally{g.dispose()}
 }
 for(let i=1;i<=1000;i++)assert(portalJourney(i/1000).z<=portalJourney((i-1)/1000).z+1e-9)
 assert(portalJourney(.45).z>0&&portalJourney(.75).z< -4)
})
test('glass fragments are individually closed volumes both assembled and exploded',()=>{
 for(const low of [false,true]){
  const {geometry:g,edges}=createGlassShards(low)
  try{
   assert.equal(g.groups.length,low?9:12)
   for(const data of [g.attributes.position,...g.morphAttributes.position!])for(const group of g.groups){
    const counts=new Map<string,number>(),v=(i:number)=>[data.getX(i),data.getY(i),data.getZ(i)].map(n=>n.toFixed(5)).join(',')
    for(let i=group.start;i<group.start+group.count;i+=3)for(const [a,b] of [[i,i+1],[i+1,i+2],[i+2,i]]){const key=[v(a),v(b)].sort().join('|');counts.set(key,(counts.get(key)||0)+1)}
    assert([...counts.values()].every(n=>n===2),'No open/internal missing triangle in a shard')
   }
   assert.equal(edges.attributes.position.count,edges.morphAttributes.position![0].count)
  }finally{g.dispose();edges.dispose()}
 }
})
