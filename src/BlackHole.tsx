import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useQuality } from './AdaptiveQuality'

const fullscreenVertex = `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`
const rayFragment = `
  // PORTAL_BLACK_HOLE: analytic gravitational lensing of a procedural 3D accretion disk.
  uniform vec3 uEye;
  uniform float uTime;
  uniform float uAspect;
  uniform vec2 uResolution;
  uniform float uPortal;
  uniform float uDetail;
  varying vec2 vUv;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
  float fbm(vec2 p){
    float value=noise(p)*.53+noise(p*2.03+4.7)*.27+noise(p*4.07+9.3)*.13;
    value+=noise(p*8.11+2.6)*.07*uDetail;
    return value;
  }
  float starLayer(vec2 angular,float scale,float salt){
    vec2 uv=angular*scale;
    vec2 id=floor(uv)+salt, f=fract(uv)-.5;
    float seed=hash(id), star=0.;
    if(seed>.982){
      f-=(vec2(hash(id+3.),hash(id+5.))-.5)*.65;
      float radius=.028+hash(id+7.)*.045, footprint=scale*.42/uResolution.y;
      float spread=radius*radius+footprint*footprint;
      star=exp(-dot(f,f)/spread)*(radius*radius/spread)*(.25+.65*hash(id+2.));
    }
    return star;
  }
  vec3 sky(vec3 d){
    vec2 angular=vec2(atan(d.x,-d.z),asin(clamp(d.y,-1.,1.)));
    vec2 parallax=uEye.xy*.0008+vec2(uEye.z-31.4)*mix(vec2(.00002,.00005),vec2(.0014,.0006),uPortal);
    float farStars=starLayer(angular+parallax*.3,120.,0.);
    float deepStars=starLayer(angular+parallax,255.,37.);
    return vec3(.00025,.0003,.0004)+vec3(farStars*.8+deepStars*.4);
  }
  float gas(vec3 p,vec3 direction,vec3 normal){
    float r=length(p);
    if(r<1.43||r>7.)return 0.;
    float edge=smoothstep(1.43,1.85,r)*(1.-smoothstep(5.5,7.,r));
    vec2 plane=vec2(p.x,dot(p,normalize(cross(normal,vec3(1,0,0)))));
    // Rotate the unit vector directly: avoid atan -> sin/cos round trips.
    float spin=uTime*.12/(r*sqrt(r))+r*.2;
    float cs=cos(spin),sn=sin(spin);
    vec2 orbit=mat2(cs,-sn,sn,cs)*(plane/r);
    float clouds=fbm(orbit*r*2.6);
    vec2 flow=orbit*r;
    float filaments=fbm(vec2(flow.x*10.+flow.y*1.4,flow.y*2.1-flow.x*.3)+clouds*1.3);
    float detail=noise(orbit*r*37.);
    float density=.16+pow(clouds,1.6)*.6+pow(filaments,2.2)*.65+pow(detail,6.)*.07;
    float radial=exp(-pow((r-2.9)*.29,2.));
    vec3 tangent=normalize(cross(normal,p));
    float doppler=.82+.24*dot(tangent,-direction);
    float thickness=clamp(.14/max(abs(dot(direction,normal)),.16),.25,.88);
    return edge*density*radial*doppler*thickness;
  }
  void main(){
    vec2 screen=vUv*2.-1.;
    float framing=min(1.,uAspect/.9);
    vec3 direction=normalize(vec3(screen.x*uAspect*.383864/framing,screen.y*.383864/framing,-1.));
    vec3 eye=uEye;
    if(length(eye)<1.035){gl_FragColor=vec4(0,0,0,1);return;}
    if(eye.z<=0.){gl_FragColor=vec4(sky(direction),1);return;}
    // Analytic thin-lens mapping at native resolution. No iterative full-screen
    // raymarch and no stretched low-resolution image: evaluate the disk in 3D.
    float critical=2.05;
    float impact=length(cross(eye,direction));
    float aa=max(fwidth(impact)*.85,.002);
    float outside=smoothstep(critical-aa,critical+aa,impact);
    vec2 plane=(eye+direction*(eye.z/max(-direction.z,.001))).xy;
    float beta=impact-critical*critical/max(impact,.001);
    vec2 warped=normalize(plane+vec2(.00001))*beta;
    vec3 normal=normalize(vec3(0.,1.,.22));
    vec3 backImage=vec3(warped.x,warped.y,-warped.y/.22);
    float lensed=0.;
    if(length(backImage)<7.1)lensed=gas(backImage,direction,normal)*outside;
    float direct=0.,denominator=dot(direction,normal);
    if(abs(denominator)>.0001){
      float distance=-dot(eye,normal)/denominator;
      if(distance>0.){
        vec3 hit=eye+direction*distance;
        if(length(hit)<7.1)direct=gas(hit,direction,normal)*mix(outside,1.,smoothstep(-.08,.08,hit.z));
      }
    }
    float photon=exp(-abs(impact-critical-.018)/max(.018,aa))*.035*outside;
    float light=direct*.82+lensed*.68+photon;
    vec3 bent=normalize(vec3(direction.xy*(1.-critical*critical/max(impact*impact,1.)*.5),direction.z));
    vec3 background=sky(bent)*outside;
    vec3 tint=mix(vec3(1.),vec3(1.35,.96,.63),uPortal);
    vec3 emission=vec3(.92)*(1.-exp(-light*1.85*tint));
    emission+=vec3(1.,.38,.12)*exp(-abs(impact-critical)*2.8)*.045*uPortal*outside;
    gl_FragColor=vec4(background+emission,1);
  }

`
const bloomFragment = `
  uniform sampler2D uScene;
  uniform vec2 uTexel;
  uniform float uOpacity;
  varying vec2 vUv;
  vec3 bright(vec2 uv){return max(texture2D(uScene,uv).rgb-.62,vec3(0));}
  void main(){
    vec3 color=texture2D(uScene,vUv).rgb;
    vec3 glow=bright(vUv+uTexel*vec2(3.,0.))+bright(vUv-uTexel*vec2(3.,0.))+bright(vUv+uTexel*vec2(0.,3.))+bright(vUv-uTexel*vec2(0.,3.));
    #ifndef LOW_QUALITY
      glow+=bright(vUv+uTexel*vec2(10.,6.))+bright(vUv-uTexel*vec2(10.,6.))+bright(vUv+uTexel*vec2(-6.,10.))+bright(vUv-uTexel*vec2(-6.,10.));
      glow*=.018;
    #else
      glow*=.024;
    #endif
    gl_FragColor=vec4(color+glow,uOpacity);
  }
`
export default function BlackHole({ opacity, clock, low, simple = false, onUnavailable }: { simple?: boolean; opacity: RefObject<number>; clock: RefObject<number>; low: boolean; onUnavailable: () => void }) {
  const tier=useQuality()
  const mesh = useRef<THREE.Mesh>(null)
  const { gl, camera, size, viewport } = useThree()
  const checked = useRef(false)
  const resources = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(2,2)
    const target = new THREE.WebGLRenderTarget(1,1,{ depthBuffer:false, stencilBuffer:false, minFilter:THREE.LinearFilter, magFilter:THREE.LinearFilter })
    const ray = new THREE.ShaderMaterial({ vertexShader:fullscreenVertex, fragmentShader:rayFragment, defines:{...(low?{LOW_QUALITY:1}:{}),...(simple?{SOFTWARE_FALLBACK:1}:{})}, depthTest:false, depthWrite:false, uniforms:{uDetail:{value:1},uPortal:{value:1},uEye:{value:new THREE.Vector3(0,0,31.4)},uTime:{value:0},uAspect:{value:1},uResolution:{value:new THREE.Vector2(1,1)}} })
    const composite = new THREE.ShaderMaterial({ vertexShader:fullscreenVertex, fragmentShader:bloomFragment, defines:{...(low?{LOW_QUALITY:1}:{}),...(simple?{SOFTWARE_FALLBACK:1}:{})}, depthTest:false,depthWrite:false,transparent:true,uniforms:{uScene:{value:target.texture},uTexel:{value:new THREE.Vector2(1,1)},uOpacity:{value:0}} })
    const scene = new THREE.Scene();scene.add(new THREE.Mesh(geometry,ray))
    const view = new THREE.OrthographicCamera(-1,1,1,-1,0,1)
    return {geometry,target,ray,composite,scene,view}
  },[low,simple])
  useLayoutEffect(()=>{
    // The base scene matches the actual canvas, including on large displays.
    // Only bloom is soft; the central silhouette and gas are never upscaled.
    const pixels=gl.getDrawingBufferSize(new THREE.Vector2())
    const width=Math.max(1,pixels.x),height=Math.max(1,pixels.y)
    resources.target.setSize(width,height)
    resources.ray.uniforms.uResolution.value.set(width,height)
    resources.composite.uniforms.uTexel.value.set(1/width,1/height);checked.current=false
  },[resources,size.width,size.height,viewport.dpr,gl])
  // Retain the scene graph during StrictMode effect replay; disposed GPU
  // resources can be recreated, but a cleared graph would stay empty.
  useEffect(()=>()=>{resources.target.dispose();resources.ray.dispose();resources.composite.dispose();resources.geometry.dispose()},[resources])
  useFrame((_,delta)=>{
    const active=opacity.current>.001
    if(mesh.current)mesh.current.visible=active
    if(!active)return
    resources.ray.uniforms.uEye.value.copy(camera.position)
    resources.ray.uniforms.uDetail.value=THREE.MathUtils.damp(resources.ray.uniforms.uDetail.value,tier==='HIGH'?1:tier==='MEDIUM'?.7:.4,3,Math.min(delta,.25));resources.ray.uniforms.uTime.value=clock.current;resources.ray.uniforms.uAspect.value=size.width/size.height
    resources.composite.uniforms.uOpacity.value=opacity.current
    const previous=gl.getRenderTarget()
    try{
      gl.setRenderTarget(resources.target)
      if(!checked.current){const context=gl.getContext();if(context.checkFramebufferStatus(context.FRAMEBUFFER)!==context.FRAMEBUFFER_COMPLETE){onUnavailable();return}checked.current=true}
      gl.clear();gl.render(resources.scene,resources.view)
    }catch{onUnavailable()}finally{gl.setRenderTarget(previous)}
  })
  return <mesh ref={mesh} geometry={resources.geometry} material={resources.composite} frustumCulled={false} renderOrder={10} visible={false}/>
}
