import test from 'node:test'
import assert from 'node:assert/strict'
import { introJourney, INTRO_DURATION } from '../src/introJourney.ts'
test('one timed journey crosses the horizon before the independent galaxy flight and settles at arrival',()=>{
  assert.equal(introJourney(-1).z,19)
  assert.equal(introJourney(.3).stage,'black-hole')
  assert.equal(introJourney(1.5).stage,'plunge')
  assert(introJourney(2.25).z<0)
  assert.equal(introJourney(3).stage,'galaxies')
  assert.equal(introJourney(3).holeOpacity,0)
  assert(introJourney(4).z < introJourney(3).z-20)
  assert.equal(introJourney(6).stage,'arrival')
  assert.equal(introJourney(99).z,-114)
  assert.equal(introJourney(INTRO_DURATION).speed,0)
  assert.equal(introJourney(INTRO_DURATION).streak,0)
})
test('camera velocity is continuous and never reverses across approach, flight and braking',()=>{
  for(const t of [.65,2.25,3.9,5.25]) {
    const e=1e-5,left=(introJourney(t).z-introJourney(t-e).z)/e,right=(introJourney(t+e).z-introJourney(t).z)/e
    assert(Math.abs(left-right)<.01,`Continuous speed at ${t}`)
  }
  for(let i=1;i<=635;i++)assert(introJourney(i/100).z<=introJourney((i-1)/100).z+1e-10)
})
test('galaxy world becomes visible before the disk fades and trails shorten during braking',()=>{
  for(let i=0;i<640;i++){
    const p=introJourney(i/100)
    assert(p.holeOpacity+p.flightOpacity>.9,'No uncovered black transition between worlds')
  }
  assert(introJourney(4.5).streak>introJourney(5.7).streak)
})
