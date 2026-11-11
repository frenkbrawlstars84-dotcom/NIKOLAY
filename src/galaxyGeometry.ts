export type GalaxyKind = 'spiral' | 'barred' | 'elliptical' | 'lenticular'
export function spiralGalaxy(seed: number, count: number, kind: GalaxyKind = 'spiral') {
  const initial=seed,random=()=>((seed=seed*16807%2147483647)-1)/2147483646
  const arms=kind==='barred'?2:2+initial%3
  const positions=new Float32Array(count*3),colors=new Float32Array(count*3),sizes=new Float32Array(count),brightness=new Float32Array(count)
  for(let i=0;i<count;i++){
    const coreStar=i<count*.17
    const radius=coreStar?Math.pow(random(),1.6)*1.2:Math.pow(random(),kind==='elliptical'?1.3:.72)*5
    const scatter=(random()+random()+random()-1.5)*(.14+radius*.11)
    let angle=kind==='elliptical'||kind==='lenticular'?random()*Math.PI*2:(i%arms)*Math.PI*2/arms+Math.log(Math.max(radius/6,.025))*(4.2+initial%4*.37)/arms+scatter
    if(kind==='barred'&&radius<1.2)angle=i%2*Math.PI+scatter*.4
    const flatten=kind==='elliptical'?.74:kind==='lenticular'?.48:1
    positions.set([Math.cos(angle)*radius,Math.sin(angle)*radius*flatten,(random()-.5)*(kind==='elliptical'?.65:.1+radius*.06)],i*3)
    const core=Math.exp(-radius*.85),birth=kind!=='elliptical'&&i%23===0&&radius>1.3
    colors.set(birth?[.49,.7,1]:[.58+core*.42,.69+core*.25,.86+core*.04],i*3)
    sizes[i]=.55+Math.pow(random(),3)*2.15
    brightness[i]=.12+.88*(1-Math.exp(-radius*1.2))
  }
  return {positions,colors,sizes,brightness}
}
