import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const fullscreenVertex = `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`
const rayFragment = `
  // TON_RAY_SCENE: finite curved-ray integration through a turbulent accretion volume.
  uniform vec3 uEye;
  uniform float uTime;
  uniform float uAspect;
  varying vec2 vUv;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
  float fbm(vec2 p){return noise(p)*.57+noise(p*2.03+4.7)*.28+noise(p*4.07+9.3)*.15;}
  vec3 sky(vec3 d){
    vec2 uv=vec2(atan(d.x,-d.z),asin(clamp(d.y,-1.,1.)))*155.;
    vec2 id=floor(uv), f=fract(uv)-.5;
    float seed=hash(id), star=0.;
    if(seed>.987){float size=.025+hash(id+7.)*.04;star=(1.-smoothstep(0.,size,length(f)))*(.13+.55*hash(id+2.));}
    return vec3(.0015,.0018,.0022)+vec3(star);
  }
  float gas(vec3 p,vec3 direction,vec3 normal){
    float r=length(p);
    float edge=smoothstep(1.43,1.85,r)*(1.-smoothstep(5.5,7.,r));
    float spin=uTime*.16/pow(max(r,1.4),1.15);
    mat2 rotation=mat2(cos(spin),-sin(spin),sin(spin),cos(spin));
    vec2 plane=vec2(p.x,dot(p,normalize(cross(normal,vec3(1,0,0)))));
    vec2 flow=rotation*plane;
    float clouds=fbm(flow*1.7+fbm(flow*.6)*2.);
    float fine=noise(flow*7.1+clouds*3.);
    float density=.18+pow(clouds,2.)*1.8+fine*.13;
    float radial=exp(-pow((r-2.7)*.31,2.));
    vec3 tangent=normalize(cross(normal,p));
    float doppler=.82+.38*dot(tangent,-direction);
    float thickness=clamp(.2/max(abs(dot(direction,normal)),.1),.25,1.7);
    return edge*density*radial*doppler*thickness;
  }
  void main(){
    vec2 screen=vUv*2.-1.;
    // Widen portrait framing so the distant disk fits before the approach.
    float framing=min(1.,uAspect/.9);
    vec3 direction=normalize(vec3(screen.x*uAspect*.383864/framing,screen.y*.383864/framing,-1.));
    vec3 origin=uEye;
    if(length(origin)<1.035){gl_FragColor=vec4(0,0,0,1);return;}
    float b=dot(origin,direction), discriminant=b*b-dot(origin,origin)+81.;
    if(discriminant<0.||-b+sqrt(max(discriminant,0.))<0.){gl_FragColor=vec4(sky(direction),1);return;}
    vec3 p=origin+direction*max(0.,-b-sqrt(max(discriminant,0.)));
    vec3 normal=normalize(vec3(0.,1.,.22));
    float light=0.; bool captured=false;
    for(int step=0;step<STEPS;step++){
      float r=length(p);
      if(r<1.035){captured=true;break;}
      float h=clamp(r*.16,.075,1.5);
      vec3 bent=normalize(direction-p*(.92*h/max(r*r*r,.01)));
      vec3 next=p+bent*h;
      float a=dot(p,normal), z=dot(next,normal);
      if(a*z<0.){
        vec3 crossing=mix(p,next,a/(a-z));
        light+=gas(crossing,bent,normal);
      }
      p=next;direction=bent;
      if(length(p)>9.1&&dot(p,direction)>0.)break;
    }
    vec3 background=captured?vec3(0):sky(direction);
    vec3 emission=vec3(1.-exp(-light*2.5));
    gl_FragColor=vec4(background+emission,1);
  }
`
const bloomFragment = `
  uniform sampler2D uScene;
  uniform vec2 uTexel;
  uniform float uOpacity;
  varying vec2 vUv;
  vec3 bright(vec2 uv){return max(texture2D(uScene,uv).rgb-.48,vec3(0));}
  void main(){
    vec3 color=texture2D(uScene,vUv).rgb;
    vec3 glow=bright(vUv+uTexel*vec2(2.,0.))+bright(vUv-uTexel*vec2(2.,0.))+bright(vUv+uTexel*vec2(0.,2.))+bright(vUv-uTexel*vec2(0.,2.));
    #ifndef LOW_QUALITY
      glow+=bright(vUv+uTexel*vec2(5.,3.))+bright(vUv-uTexel*vec2(5.,3.))+bright(vUv+uTexel*vec2(-3.,5.))+bright(vUv-uTexel*vec2(-3.,5.));
      glow*=.055;
    #else
      glow*=.075;
    #endif
    gl_FragColor=vec4(color+glow,uOpacity);
  }
`
export default function BlackHole({ progress, clock, low, onUnavailable }: { progress: RefObject<number>; clock: RefObject<number>; low: boolean; onUnavailable: () => void }) {
  const mesh = useRef<THREE.Mesh>(null)
  const { gl, camera, size } = useThree()
  const checked = useRef(false)
  const resources = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(2,2)
    const target = new THREE.WebGLRenderTarget(1,1,{ depthBuffer:false, stencilBuffer:false, minFilter:THREE.LinearFilter, magFilter:THREE.LinearFilter })
    const ray = new THREE.ShaderMaterial({ vertexShader:fullscreenVertex, fragmentShader:rayFragment, defines:{ STEPS:low?40:64 }, depthTest:false, depthWrite:false, uniforms:{uEye:{value:new THREE.Vector3(0,0,31.4)},uTime:{value:0},uAspect:{value:1}} })
    const composite = new THREE.ShaderMaterial({ vertexShader:fullscreenVertex, fragmentShader:bloomFragment, defines:low?{LOW_QUALITY:1}:{}, depthTest:false,depthWrite:false,transparent:true,uniforms:{uScene:{value:target.texture},uTexel:{value:new THREE.Vector2(1,1)},uOpacity:{value:0}} })
    const scene = new THREE.Scene();scene.add(new THREE.Mesh(geometry,ray))
    const view = new THREE.OrthographicCamera(-1,1,1,-1,0,1)
    return {geometry,target,ray,composite,scene,view}
  },[low])
  useLayoutEffect(()=>{
    const factor=Math.min(gl.getPixelRatio()*.5,(low?640:1100)/size.width)
    const width=Math.max(1,Math.round(size.width*factor)),height=Math.max(1,Math.round(size.height*factor))
    resources.target.setSize(width,height);resources.composite.uniforms.uTexel.value.set(1/width,1/height);checked.current=false
  },[resources,size.width,size.height,gl,low])
  useEffect(()=>()=>{resources.target.dispose();resources.ray.dispose();resources.composite.dispose();resources.geometry.dispose();resources.scene.clear()},[resources])
  useFrame(()=>{
    const p=progress.current,active=p>.26&&p<.999
    if(mesh.current)mesh.current.visible=active
    if(!active)return
    resources.ray.uniforms.uEye.value.copy(camera.position);resources.ray.uniforms.uEye.value.z+=24
    resources.ray.uniforms.uTime.value=clock.current;resources.ray.uniforms.uAspect.value=size.width/size.height
    resources.composite.uniforms.uOpacity.value=THREE.MathUtils.smoothstep(p,.27,.38)*(1-THREE.MathUtils.smoothstep(p,.975,1))
    const previous=gl.getRenderTarget()
    try{
      gl.setRenderTarget(resources.target)
      if(!checked.current){const context=gl.getContext();if(context.checkFramebufferStatus(context.FRAMEBUFFER)!==context.FRAMEBUFFER_COMPLETE){onUnavailable();return}checked.current=true}
      gl.clear();gl.render(resources.scene,resources.view)
    }catch{onUnavailable()}finally{gl.setRenderTarget(previous)}
  })
  return <mesh ref={mesh} geometry={resources.geometry} material={resources.composite} frustumCulled={false} renderOrder={10} visible={false}/>
}
