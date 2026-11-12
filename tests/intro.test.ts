import test from 'node:test'
import assert from 'node:assert/strict'
import {INTRO_DURATION,INTRO_SESSION_KEY,introFrame,markIntroSeen,shouldPlayIntro} from '../src/introState.ts'
test('intro reads only its session key; preview overrides it; initialization does not write',()=>{
 const values=new Map<string,string>([['introPlayed','1'],['nikolayIntroSeen','1']])
 const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value)}}
 assert(shouldPlayIntro('',storage));assert(shouldPlayIntro('',storage));assert(!values.has(INTRO_SESSION_KEY))
 markIntroSeen(storage);assert(!shouldPlayIntro('',storage));assert(shouldPlayIntro('?previewIntro=1',storage))
 assert(shouldPlayIntro('',null));assert.doesNotThrow(()=>markIntroSeen(null))
 const denied={getItem:()=>{throw new Error('denied')},setItem:()=>{throw new Error('denied')}}
 assert(shouldPlayIntro('',denied));assert.doesNotThrow(()=>markIntroSeen(denied))
})
test('autonomous time visits one hole, then galaxies, then reveal and completes',()=>{
 const frames=Array.from({length:1001},(_,i)=>introFrame(i/1000*INTRO_DURATION))
 assert.equal(frames[0].phase,'black-hole');assert(frames[0].distance>0)
 const galaxy=frames.findIndex(f=>f.phase==='galaxies'),reveal=frames.findIndex(f=>f.phase==='reveal')
 assert(galaxy>0&&reveal>galaxy)
 for(let i=1;i<frames.length;i++)assert(frames[i].distance<=frames[i-1].distance)
 assert(frames.slice(galaxy).every(f=>f.distance<0&&f.phase!=='black-hole'))
 assert.equal(frames.at(-1)?.done,true);assert.equal(frames.at(-1)?.fade,1)
 assert.equal(introFrame(-1).progress,0);assert.equal(introFrame(100).progress,1)
 assert.equal(introFrame(2.4,true).done,true)
 // Distance travelled in the last equally sized interval is smaller: arrival slows.
 assert(Math.abs(frames[990].distance-frames[980].distance)<Math.abs(frames[700].distance-frames[690].distance))
})
