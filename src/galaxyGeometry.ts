export function spiralGalaxy(seed: number, count: number) {
  const random=()=>((seed=seed*16807%2147483647)-1)/2147483646
  const arms=2+seed%3
  const positions=new Float32Array(count*3),colors=new Float32Array(count*3)
  for(let i=0;i<count;i++){
    const radius=Math.pow(random(),.8)*5
    const scatter=(random()+random()+random()-1.5)*(.18+radius*.12)
    const angle=(i%arms)*Math.PI*2/arms+Math.log(1+radius)*2.8+scatter
    positions.set([Math.cos(angle)*radius,Math.sin(angle)*radius,(random()-.5)*(.1+radius*.07)],i*3)
    const core=Math.exp(-radius*.7)
    colors.set([.58+core*.42,.69+core*.3,.86+core*.12],i*3)
  }
  return {positions,colors}
}
