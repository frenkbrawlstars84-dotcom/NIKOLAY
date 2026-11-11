// Deliberately free of Three.js: content remains available if its download fails.
export default function SceneFallback() {
  return <div className="fallback-position"><div className="scene-fallback" aria-label="Статичная орбитальная скульптура"><svg viewBox="0 0 640 600" fill="none" aria-hidden="true">
    <defs><radialGradient id="hero-portal-haze"><stop stopColor="#6384ad" stopOpacity=".14"/><stop offset="1" stopColor="#6384ad" stopOpacity="0"/></radialGradient><linearGradient id="hero-portal-light"><stop stopColor="#c1d9f5" stopOpacity=".06"/><stop offset=".5" stopColor="#e2efff" stopOpacity=".7"/><stop offset="1" stopColor="#7590b6" stopOpacity=".12"/></linearGradient></defs>
    <ellipse cx="325" cy="290" rx="260" ry="250" fill="url(#hero-portal-haze)"/>
    {[0,1,2,3,4].map(i=><ellipse key={i} cx="320" cy="290" rx={170+i*7} ry={60+i*8} transform={`rotate(${i*39-35} 320 290)`} stroke="url(#hero-portal-light)" strokeWidth={i%2?8:14}/>)}
    <path d="M320 231 370 267 351 328 290 341 268 277Z" fill="#20354f" stroke="#9cb3d2" strokeWidth="1.5"/><path d="m320 231 6 57 44-21m-44 21 25 40m-25-40-36 53m36-53-58-11" stroke="#6d8ab0"/>
    {Array.from({length:32},(_,i)=><circle key={i} cx={320+Math.cos(i*2.4)*(90+i*4.2)} cy={285+Math.sin(i*2.4)*(100+i*3.8)} r={i%5?1:1.6} fill="#c3d5ef" opacity=".4"/>)}
  </svg></div></div>
}
