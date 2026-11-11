import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import BlackHole from './BlackHole'
import CanvasHealth from './CanvasHealth'

// Procedural star segments occupy different world depths; flight changes the
// camera position, rather than scaling a texture or moving the DOM canvas.
function Flight({ onReady, onUnavailable }: { onReady: () => void; onUnavailable: () => void }) {
  const elapsed = useRef(0), progress = useRef(.6), clock = useRef(0)
  const streaks = useRef<THREE.LineSegments>(null)
  const positions = useMemo(() => {
    let seed = 671
    const random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646
    const data = new Float32Array(220 * 6)
    for (let i = 0; i < 220; i++) {
      const a = random() * Math.PI * 2, r = 3.5 + random() * 26, z = -24 + random() * 52
      data.set([Math.cos(a)*r, Math.sin(a)*r, z, Math.cos(a)*r, Math.sin(a)*r, z-.06-random()*.35], i*6)
    }
    return data
  }, [])
  useFrame(({ camera }, delta) => {
    if (document.hidden) return
    elapsed.current += delta
    clock.current = elapsed.current
    const t = THREE.MathUtils.clamp((elapsed.current-.7)/2.8, 0, 1)
    const travel = t*t*t
    camera.position.set(Math.sin(t*Math.PI)*.14, Math.sin(t*Math.PI)*.08, 19-21.5*travel)
    if (streaks.current) {
      streaks.current.scale.z = 1 + travel*.6
      ;(streaks.current.material as THREE.LineBasicMaterial).opacity = .08 + travel*.4
    }
  }, -1)
  return <>
    <CanvasHealth onReady={onReady} onUnavailable={onUnavailable}/>
    <lineSegments ref={streaks} frustumCulled={false} renderOrder={11}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]}/></bufferGeometry>
      <lineBasicMaterial color="#b8d6ff" transparent opacity={.08} depthTest={false} depthWrite={false}/>
    </lineSegments>
    <BlackHole portal progress={progress} clock={clock} low={innerWidth<=700 || navigator.hardwareConcurrency<=4} onUnavailable={onUnavailable}/>
  </>
}
export default function PortalScene(props: { onReady: () => void; onUnavailable: () => void }) {
  const [visible,setVisible]=useState(!document.hidden)
  useEffect(()=>{
    const change=()=>setVisible(!document.hidden)
    document.addEventListener('visibilitychange',change)
    return ()=>document.removeEventListener('visibilitychange',change)
  },[])
  const low=innerWidth<=700 || navigator.hardwareConcurrency<=4
  return <Canvas frameloop={visible?'always':'demand'} camera={{ position: [0,0,19], fov: 42, near: .1, far: 100 }} dpr={[1, Math.min(devicePixelRatio, low?1:1.5)]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}>
    <Flight {...props}/>
  </Canvas>
}
