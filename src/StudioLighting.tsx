import { useEffect, useLayoutEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

export default function StudioLighting({ low, monochrome }: { low: boolean; monochrome: boolean }) {
  const { scene } = useThree()
  const environment = useMemo(() => {
    const size = low ? 64 : 128
    const faces = Array.from({ length: 6 }, (_, side) => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = size
      const paint = canvas.getContext('2d')!
      const gradient = paint.createLinearGradient(0, 0, size, size)
      gradient.addColorStop(0, side === 2 ? '#ededed' : monochrome ? '#252525' : '#1c293e'); gradient.addColorStop(.46, monochrome ? '#737373' : '#52677f'); gradient.addColorStop(.53, monochrome ? '#d6d6d6' : '#bacbdc'); gradient.addColorStop(.68, monochrome ? '#383838' : '#263851'); gradient.addColorStop(1, monochrome ? '#111111' : '#0b1220')
      paint.fillStyle = gradient; paint.fillRect(0, 0, size, size)
      paint.fillStyle = monochrome ? '#ffffff' : '#e7f0ff'; paint.globalAlpha = side % 2 ? .72 : .3; paint.fillRect(size * .15, size * .08, size * .13, size * .72)
      return canvas
    })
    const texture = new THREE.CubeTexture(faces); texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true
    return texture
  }, [low, monochrome])
  useLayoutEffect(() => { const previous = scene.environment; scene.environment = environment; return () => { scene.environment = previous } }, [scene, environment])
  useEffect(() => () => environment.dispose(), [environment])
  return <><ambientLight intensity={.6}/><directionalLight position={[4, 6, 5]} intensity={3} color={monochrome ? '#ffffff' : '#d6e6ff'}/><directionalLight position={[-4, 1, 2]} intensity={1.1} color={monochrome ? '#d9d9d9' : '#7f98c5'}/><directionalLight position={[0, -3, -3]} intensity={.8} color={monochrome ? '#b8b8b8' : '#c6a5b5'}/></>
}
