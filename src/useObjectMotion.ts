import { useEffect, useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { ObjectInteraction } from './objectInteraction'

// One timing policy shared by all interactive scenes; hidden scenes preserve time.
export default function useObjectMotion(interaction: ObjectInteraction, paused: boolean, reduced: boolean) {
  const fresh = useRef(true), { invalidate } = useThree()
  useLayoutEffect(() => { fresh.current = true; if(reduced)interaction.settle(); invalidate() }, [paused, reduced, interaction, invalidate])
  useEffect(() => interaction.subscribe(invalidate), [interaction, invalidate])
  useFrame((_, delta) => {
    const dt = fresh.current || !Number.isFinite(delta) ? 0 : Math.max(0, delta)
    fresh.current = false
    if (!paused && !reduced) interaction.advance(dt)
  }, -2)
}
