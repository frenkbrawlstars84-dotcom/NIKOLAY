import test from 'node:test'
import assert from 'node:assert/strict'
import { INTRO_DURATION, introFrame } from '../src/introTimeline.ts'

test('the only space journey finishes in 5–6 seconds and overlaps the disk with the flight', () => {
  assert(INTRO_DURATION >= 5 && INTRO_DURATION <= 6)
  let lastEye = Infinity, lastTravel = 0
  for (let t = 0; t <= INTRO_DURATION; t += .01) {
    const frame = introFrame(t)
    assert(frame.eye <= lastEye && frame.eye > 1.035, 'Camera never waits inside the shader’s black horizon')
    assert(frame.travel >= lastTravel)
    if (t < 4.7) assert(frame.hole + frame.flight >= .95, 'No empty gap between visible scenes')
    lastEye = frame.eye; lastTravel = frame.travel
  }
  assert.equal(introFrame(0).hole, 1)
  assert.equal(introFrame(3).hole, 0)
  assert.equal(introFrame(3).flight, 1)
  assert.equal(introFrame(INTRO_DURATION).opacity, 0)
  assert.equal(introFrame(INTRO_DURATION).phase, 'reveal')
})


test('flight coasts smoothly and the last galaxy leaves before the hero crossfade',()=>{
 const speed=(t:number)=>(introFrame(t+.001).travel-introFrame(t-.001).travel)/.002
 assert(speed(4.3)<speed(3))
 assert(speed(5.7)<speed(4.3))
 assert(Math.abs(speed(5.799))<.02)
 assert(introFrame(4.7).travel-38>0,'The farther galaxy has passed the camera before reveal')
 assert.equal(introFrame(5.2).opacity,1)
 assert.equal(introFrame(5.75).opacity,0)
})
