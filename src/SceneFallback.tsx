// Deliberately free of Three.js: content remains available if its download fails.
export default function SceneFallback() {
  return <div className="fallback-position"><div className="scene-fallback" aria-label="Статичная версия энергетического портала"><svg viewBox="0 0 640 600" fill="none" aria-hidden="true">
    <defs><radialGradient id="hero-portal-haze"><stop stopColor="#6384ad" stopOpacity=".14"/><stop offset="1" stopColor="#6384ad" stopOpacity="0"/></radialGradient><linearGradient id="hero-portal-light"><stop stopColor="#c1d9f5" stopOpacity=".06"/><stop offset=".5" stopColor="#e2efff" stopOpacity=".7"/><stop offset="1" stopColor="#7590b6" stopOpacity=".12"/></linearGradient></defs>
    <ellipse cx="325" cy="290" rx="260" ry="250" fill="url(#hero-portal-haze)"/>
    {[0,1,2,3].map(i=><ellipse key={i} cx={310+i*17} cy={270+i*9} rx={208-i*43} ry={216-i*44} transform={`rotate(-18 ${310+i*17} ${270+i*9})`} stroke="url(#hero-portal-light)" strokeWidth={i?1:2} strokeDasharray={i%2?'100 32 190 60':'320 90 100 60'}/>)}
    {Array.from({length:7},(_,i)=>{const a=i*Math.PI*2/7,x=310+Math.cos(a)*208,y=270+Math.sin(a)*216;return <path key={i} d={`M${x} ${y} C${310+Math.cos(a+1)*190} ${270+Math.sin(a+1)*190} ${360+Math.cos(a+2)*75} ${297+Math.sin(a+2)*75} 370 300`} stroke="url(#hero-portal-light)" strokeWidth="2"/>})}
    {Array.from({length:32},(_,i)=><circle key={i} cx={320+Math.cos(i*2.4)*(90+i*4.2)} cy={285+Math.sin(i*2.4)*(100+i*3.8)} r={i%5?1:1.6} fill="#c3d5ef" opacity=".4"/>)}
  </svg></div></div>
}
