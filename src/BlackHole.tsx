import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const diskVertex = `varying vec2 vLocal; void main(){ vLocal=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`
const diskFragment = `
  uniform float uTime; uniform float uOpacity; varying vec2 vLocal;
  void main(){
    float r=length(vLocal); float a=atan(vLocal.y,vLocal.x);
    float edge=smoothstep(1.22,1.43,r)*(1.-smoothstep(3.8,4.9,r));
    float grain=.5+.5*sin(r*74.-a*5.-uTime*.8+sin(a*4.+r*7.)*.5);
    float ribbons=pow(grain,4.)*.7+pow(.5+.5*sin(r*130.-a*3.+uTime*.35),10.)*.25;
    float core=exp(-pow((r-1.54)*2.5,2.));
    float light=(.16+ribbons+core*.8)*(1.2/(1.+(r-1.3)*.32));
    float doppler=.72+.28*cos(a-.5);
    gl_FragColor=vec4(vec3(.94,.95,.97)*light*doppler,edge*uOpacity*.8);
  }
`
const rayVertex = `attribute float aPhase; varying float vPhase; void main(){vPhase=aPhase;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`
const rayFragment = `uniform float uTime;uniform float uOpacity;varying float vPhase;void main(){float pulse=.3+.7*pow(.5+.5*sin(vPhase*3.-uTime*.2),4.);gl_FragColor=vec4(vec3(.84,.86,.9),pulse*uOpacity*.36);}`
export default function BlackHole({ progress, clock, low }: { progress: RefObject<number>; clock: RefObject<number>; low: boolean }) {
  const group = useRef<THREE.Group>(null)
  const resources = useMemo(() => {
    const disk = new THREE.RingGeometry(1.23, 4.9, low ? 96 : 160, 1)
    const sphere = new THREE.SphereGeometry(1.12, low ? 24 : 48, low ? 16 : 32)
    const rim = new THREE.TorusGeometry(1.135, .012, 5, low ? 80 : 140)
    const diskMaterial = new THREE.ShaderMaterial({ vertexShader: diskVertex, fragmentShader: diskFragment, uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } }, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
    const positions: number[] = [], phases: number[] = []
    for (let line = 0; line < (low ? 10 : 22); line++) for (let k = 0; k < (low ? 96 : 144); k++) for (const offset of [0, 1]) {
      const t = (k + offset) / (low ? 96 : 144) * Math.PI * 2
      const f = line / (low ? 10 : 22), r = 1.18 + f * .75
      positions.push(Math.sin(t) * r, Math.cos(t) * r * (.88 + f * .08), Math.sin(t * 2 + f) * .24)
      phases.push(t + f * 5)
    }
    const rays = new THREE.BufferGeometry()
    rays.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); rays.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1))
    const rayMaterial = new THREE.ShaderMaterial({ vertexShader: rayVertex, fragmentShader: rayFragment, uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    const dark = new THREE.MeshBasicMaterial({ color: '#000000', side: THREE.DoubleSide })
    const silver = new THREE.MeshBasicMaterial({ color: '#f1f1f1', transparent: true, opacity: 0 })
    return { disk, sphere, rim, diskMaterial, rays, rayMaterial, dark, silver }
  }, [low])
  useEffect(() => () => { Object.values(resources).forEach(resource => resource.dispose()) }, [resources])
  useFrame(() => {
    const p = progress.current, reveal = THREE.MathUtils.smoothstep(p, .43, .6), exit = 1 - THREE.MathUtils.smoothstep(p, .94, .98)
    if (group.current) group.current.visible = p > .42 && p < .985
    resources.diskMaterial.uniforms.uTime.value = clock.current
    resources.diskMaterial.uniforms.uOpacity.value = reveal * exit
    resources.rayMaterial.uniforms.uTime.value = clock.current
    resources.rayMaterial.uniforms.uOpacity.value = reveal * exit
    resources.silver.opacity = reveal * exit * .8
  })
  return <group ref={group} position={[0, 0, -24]} visible={false}>
    <mesh geometry={resources.sphere} material={resources.dark} />
    <mesh geometry={resources.disk} material={resources.diskMaterial} rotation={[1.22, .04, -.08]} />
    <mesh geometry={resources.rim} material={resources.silver}/>
    <lineSegments geometry={resources.rays} material={resources.rayMaterial}/>
  </group>
}
