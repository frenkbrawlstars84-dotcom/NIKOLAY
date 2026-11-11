export class QualityPolicy {
 mean=0;seconds=0;frames=0;cooldown=0
 tick(delta:number,level:number,ceiling=2,active=true){
  if(!active||!Number.isFinite(delta)||delta<=0||delta>.5){this.mean=0;this.seconds=0;this.frames=0;return level}
  this.mean=this.mean?this.mean+(delta*1000-this.mean)*.06:delta*1000
  this.seconds+=delta;this.frames++;this.cooldown+=delta
  if(this.seconds<2||this.frames<12)return level
  let next=level
  if(this.mean>30&&level>0&&this.cooldown>8)next=level-1
  else if(this.mean<18&&level<ceiling&&this.cooldown>15)next=level+1
  if(next!==level)this.cooldown=0
  this.seconds=0;this.frames=0
  return next
 }
}
