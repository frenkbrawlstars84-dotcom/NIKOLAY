import test from 'node:test'
import assert from 'node:assert/strict'
import {portalJourney} from '../src/portalJourney.ts'
import {QualityPolicy} from '../src/qualityPolicy.ts'
test('energy camera crosses the entire funnel once and reverses on identical scroll samples',()=>{
 const samples=Array.from({length:1001},(_,i)=>portalJourney(i/1000))
 assert.equal(samples[0].z,7.4);assert.equal(samples.at(-1)!.z,-7)
 assert(portalJourney(.45).z>.85);assert(portalJourney(.75).z< -4)
 for(let i=1;i<samples.length;i++)assert(samples[i].z<=samples[i-1].z+1e-9)
 assert.deepEqual(samples,[...samples].reverse().map((_,i)=>portalJourney((1000-i)/1000)).reverse())
 for(const p of [.2,.45,.75]){const e=1e-5,l=(portalJourney(p).z-portalJourney(p-e).z)/e,r=(portalJourney(p+e).z-portalJourney(p).z)/e;assert(Math.abs(l-r)<.02)}
})
test('quality uses sustained timing, bounded tiers and different downgrade/upgrade delays',()=>{
 const policy=new QualityPolicy();let level=2
 for(let i=0;i<140;i++)level=policy.tick(.05,level)
 assert.equal(level,2,'Transient slow frames do not cause flicker')
 for(let i=0;i<80;i++)level=policy.tick(.05,level)
 assert.equal(level,1)
 for(let i=0;i<500;i++)level=policy.tick(.01,level)
 assert.equal(level,1,'Recovery requires a longer stable window')
 for(let i=0;i<1600;i++)level=policy.tick(.01,level)
 assert.equal(level,2)
 assert.equal(policy.tick(3,level),2,'Suspension is not a performance sample')
})
