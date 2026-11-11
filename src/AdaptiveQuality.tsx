import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { QualityPolicy } from './qualityPolicy'
import { useFrame, useThree } from '@react-three/fiber'
export type QualityTier='LOW'|'MEDIUM'|'HIGH'
const levels:QualityTier[]=['LOW','MEDIUM','HIGH']
const QualityContext=createContext<QualityTier>('HIGH')
export const useQuality=()=>useContext(QualityContext)
export default function AdaptiveQuality({children,low=false,active=true}:{children:ReactNode;low?:boolean;active?:boolean}){
 const [index,setIndex]=useState(low?0:2),{setDpr,gl}=useThree()
 useEffect(()=>{if(low)setIndex(v=>Math.min(v,1))},[low])
 const sample=useRef(new QualityPolicy())
 useEffect(()=>{setDpr(Math.min(devicePixelRatio,[1,1.25,1.75][index]));gl.domElement.dataset.quality=levels[index]},[index,setDpr,gl])
 useFrame((_,delta)=>{
  const next=sample.current.tick(delta,index,low?1:2,active&&!document.hidden)
  if(next!==index)setIndex(next)
 },-100)
 return <QualityContext.Provider value={levels[index]}>{children}</QualityContext.Provider>
}
