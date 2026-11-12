import test from 'node:test'
import assert from 'node:assert/strict'
import { cameraDistance, journeyProgress } from '../src/tonTravel.ts'

test('the flight starts after the readable hero and has bounded endpoints', () => {
  assert.equal(journeyProgress(-1), 0)
  assert.equal(journeyProgress(.28), 0)
  assert.equal(journeyProgress(.64), .5)
  assert.equal(journeyProgress(2), 1)
  assert.equal(cameraDistance(-1), 31.4)
  assert.equal(cameraDistance(2), -16)
})

test('the camera approaches, crosses the horizon and exits on a finite reversible path', () => {
  const keys = [0, .25, .55, .7, 1], distances = [31.4, 26, 12, -1.4, -16]
  keys.forEach((key, i) => assert(Math.abs(cameraDistance(key) - distances[i]) < 1e-10))
  const forward = Array.from({ length: 1001 }, (_, i) => cameraDistance(i / 1000))
  for (let i = 1; i < forward.length; i++) {
    assert(Number.isFinite(forward[i]))
    assert(forward[i] < forward[i - 1], 'Camera never stalls or moves backward during the approach')
  }
  const backward = Array.from({ length: 1001 }, (_, i) => cameraDistance((1000 - i) / 1000))
  assert.deepEqual(backward.reverse(), forward)
  // The event horizon is crossed before the final galaxy flight, rather than an infinite zoom.
  assert(cameraDistance(.6) > 1.035)
  assert(cameraDistance(.7) < 1.035)
})

test('camera velocity is continuous at all scroll stage boundaries', () => {
  const epsilon = 1e-5
  for (const key of [.25, .55, .7]) {
    const left = (cameraDistance(key) - cameraDistance(key - epsilon)) / epsilon
    const right = (cameraDistance(key + epsilon) - cameraDistance(key)) / epsilon
    assert(Math.abs(left - right) < .01, `No velocity jump at ${key}`)
  }
})
