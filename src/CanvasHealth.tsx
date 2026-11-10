import { useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'

export default function CanvasHealth({ onReady, onUnavailable }: { onReady: () => void; onUnavailable: () => void }) {
  const { gl } = useThree()
  useLayoutEffect(() => {
    const previous = gl.debug.onShaderError
    const lost = (event: Event) => { event.preventDefault(); onUnavailable() }
    gl.debug.onShaderError = () => onUnavailable()
    gl.domElement.addEventListener('webglcontextlost', lost)
    let frame = 0
    const check = () => { if (gl.info.render.frame > 0) onReady(); else frame = requestAnimationFrame(check) }
    frame = requestAnimationFrame(check)
    return () => { cancelAnimationFrame(frame); gl.debug.onShaderError = previous; gl.domElement.removeEventListener('webglcontextlost', lost) }
  }, [gl, onReady, onUnavailable])
  return null
}
