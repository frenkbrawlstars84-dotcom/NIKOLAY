// Finite camera path for the autonomous opening intro only.
const keys = [0, .25, .55, .7, 1]
const distances = [31.4, 26, 12, -1.4, -16]
const secants = keys.slice(1).map((key, i) => (distances[i + 1] - distances[i]) / (key - keys[i]))
const slopes = [secants[0], ...secants.slice(1).map((slope, i) => 2 / (1 / secants[i] + 1 / slope)), secants.at(-1)!]
export function cameraDistance(progress: number) {
  const p = Math.max(0, Math.min(1, progress))
  const i = Math.min(3, keys.findIndex((key, index) => index < 4 && p >= key && p <= keys[index + 1]))
  const span = keys[i + 1] - keys[i], t = (p - keys[i]) / span, t2 = t * t, t3 = t2 * t
  return (2 * t3 - 3 * t2 + 1) * distances[i] + (t3 - 2 * t2 + t) * span * slopes[i] + (-2 * t3 + 3 * t2) * distances[i + 1] + (t3 - t2) * span * slopes[i + 1]
}
