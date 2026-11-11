import test from 'node:test'
import assert from 'node:assert/strict'
import {QualityPolicy} from '../src/qualityPolicy.ts'
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
