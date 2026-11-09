// This component must not import Three.js: it also handles a failed 3D download.
export default function SceneFallback() {
  return <div className="fallback-position"><div className="scene-fallback" aria-label="Статичная графическая версия скульптуры"><svg viewBox="0 0 600 600" fill="none">{Array.from({ length: 45 }, (_, i) => <ellipse key={i} cx="300" cy="300" rx={90 + i * 3} ry={180 - i * 2.4} transform={`rotate(${i * 4} 300 300)`} stroke="#b7bdc5" strokeOpacity=".35" strokeWidth=".65" />)}</svg></div></div>
}
