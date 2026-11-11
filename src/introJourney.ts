// Time, not scrolling, owns this one-way journey. Hermite tangents keep speed
// continuous at the horizon, cruising section and final deceleration.
export const ARRIVAL_TIME = 5.25
export const INTRO_DURATION = 6.35
const times = [0, .65, 2.25, 3.9, 5.25, INTRO_DURATION]
const positions = [19, 19, -3, -63, -106, -114]
const velocities = [0, 0, -40, -28, -12, 0]
export function smoothRange(a: number, b: number, value: number) {
  const x = Math.max(0, Math.min(1, (value-a)/(b-a)))
  return x*x*(3-2*x)
}
export function introJourney(seconds: number) {
  const t=Math.max(0,Math.min(INTRO_DURATION,seconds))
  let i=0
  while(i<times.length-2&&t>times[i+1])i++
  const span=times[i+1]-times[i],u=(t-times[i])/span,u2=u*u,u3=u2*u
  const z=(2*u3-3*u2+1)*positions[i]+(u3-2*u2+u)*span*velocities[i]+(-2*u3+3*u2)*positions[i+1]+(u3-u2)*span*velocities[i+1]
  const speed=(6*u2-6*u)*positions[i]/span+(3*u2-4*u+1)*velocities[i]+(-6*u2+6*u)*positions[i+1]/span+(3*u2-2*u)*velocities[i+1]
  return {z,speed:Math.abs(speed),holeOpacity:1-smoothRange(2.04,2.4,t),flightOpacity:smoothRange(1.95,2.32,t),streak:Math.min(1,Math.abs(speed)/38)*(1-smoothRange(4.6,INTRO_DURATION,t)),stage:t<.65?'black-hole':t<2.25?'plunge':t<ARRIVAL_TIME?'galaxies':'arrival'}
}
