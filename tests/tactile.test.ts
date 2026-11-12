import test from 'node:test'
import assert from 'node:assert/strict'
import { TactileMotion } from '../src/tactileMotion.ts'

test('hover, activation and return are reversible, bounded and settle exactly',()=>{
 const m=new TactileMotion();m.hovered=true;m.step(.02);assert.equal(m.phase,'HOVER')
 m.toggle();for(let i=0;i<300;i++)m.step(1/60)
 assert.equal(m.value,1);assert.equal(m.phase,'ACTIVE')
 m.toggle();m.step(.02);assert.equal(m.phase,'RETURN')
 for(let i=0;i<300;i++)m.step(1/60)
 assert.equal(m.value,0);assert.equal(m.phase,'HOVER')
 m.hovered=false;m.step(.02);assert.equal(m.phase,'IDLE')
})
test('rapid repeated clicks keep one spring with continuous pose and no runaway velocity',()=>{
 const m=new TactileMotion()
 for(let i=0;i<200;i++) {m.toggle();const before=m.value;m.step(i%2?.016:.05);assert(Math.abs(m.value-before)<.25);assert(m.value>=0&&m.value<=1);assert(Number.isFinite(m.velocity))}
 for(let i=0;i<300;i++)m.step(.016)
 assert.equal(m.value,0)
 m.toggle();m.step(.01,true);assert.equal(m.value,1);assert.equal(m.flash,0)
})
