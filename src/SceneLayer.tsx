import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import SceneFallback from './SceneFallback'

const Scene = lazy(() => import('./Scene'))
export type SceneStatus = 'loading' | 'ready' | 'fallback'

// The boundary is OUTSIDE lazy(): errors importing the scene cannot reach App.
class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure() }
  render() { return this.state.failed ? <SceneFallback /> : this.props.children }
}

export default function SceneLayer({ reduced, paused, enabled, onStatus }: {
  reduced: boolean; paused: boolean; enabled: boolean
  onStatus: (status: SceneStatus) => void
}) {
  const [status, setStatus] = useState<SceneStatus>('loading')
  const phase = useRef<SceneStatus>('loading')
  const fail = useCallback(() => {
    if (phase.current === 'fallback') return
    phase.current = 'fallback'; setStatus('fallback'); onStatus('fallback')
  }, [onStatus])
  const ready = useCallback(() => {
    if (phase.current !== 'loading') return
    phase.current = 'ready'; setStatus('ready'); onStatus('ready')
  }, [onStatus])
  useEffect(() => {
    if (!enabled || status !== 'loading') return
    // Slow/blocked imports and a renderer that never draws cannot hold the page.
    const timeout = window.setTimeout(fail, 10_000)
    return () => clearTimeout(timeout)
  }, [enabled, status, fail])
  return <div className="scene-layer" data-scene-status={status}>
    {!enabled || status === 'fallback' ? <SceneFallback /> : <SceneBoundary onFailure={fail}>
      <Suspense fallback={<SceneFallback />}><Scene reduced={reduced} paused={paused} onReady={ready} onUnavailable={fail}/></Suspense>
    </SceneBoundary>}
  </div>
}
