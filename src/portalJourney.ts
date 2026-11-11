export function smooth(a:number,b:number,p:number){const t=Math.max(0,Math.min(1,(p-a)/(b-a)));return t*t*(3-2*t)}
export function portalJourney(progress:number){
 const p=Math.max(0,Math.min(1,progress)),keys=[0,.2,.45,.75,1],values=[7.4,7.4,1.4,-4.6,-7],slopes=[0,0,-27,-14,0]
 let i=0;while(i<3&&p>keys[i+1])i++
 const span=keys[i+1]-keys[i],t=(p-keys[i])/span,t2=t*t,t3=t2*t
 const z=(2*t3-3*t2+1)*values[i]+(t3-2*t2+t)*span*slopes[i]+(-2*t3+3*t2)*values[i+1]+(t3-t2)*span*slopes[i+1]
 const depth=Math.max(0,Math.min(1,(.85-z)/4.8))
 return {z,x:.32*depth*depth,y:-.06*depth*depth,center:smooth(.18,.44,p),opacity:1-smooth(.83,1,p),activation:smooth(0,.2,p)}
}
