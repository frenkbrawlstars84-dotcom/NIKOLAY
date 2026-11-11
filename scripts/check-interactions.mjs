import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {writeFile} from 'node:fs/promises'
const url=process.env.INTERACTION_TEST_URL||'http://127.0.0.1:4173'
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--enable-unsafe-swiftshader']})
const labels={hero:'Раскрыть орбитальный объект',signal:'Расплести хромированный узел',glass:'Разобрать и собрать стеклянный многогранник',cube:'Кубик Рубика: перемешать и собрать'}
async function prepare(options={}){
 const page=await browser.newPage(options),errors=[]
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
 await page.addInitScript(()=>{
  sessionStorage.setItem('nikolay-portal-seen-v1','1')
  window.__interaction={morph:{},camera:7.4,frames:{},batches:[],maxActive:0}
  const names=new WeakMap(),proto=WebGL2RenderingContext.prototype,location=proto.getUniformLocation
  const kind=c=>c.closest('.experience-art')?'hero':c.closest('.accent-signal')?'signal':c.closest('.accent-glass')?'glass':c.closest('.accent-cube')?'cube':null
  proto.getUniformLocation=function(program,name){const l=location.call(this,program,name);if(l)names.set(l,name);return l}
  const values=proto.uniform1fv
  proto.uniform1fv=function(l,data){const k=kind(this.canvas);if(k&&names.get(l)?.startsWith('morphTargetInfluences'))window.__interaction.morph[k]=Array.from(data);return values.call(this,l,data)}
  const matrix=proto.uniformMatrix4fv
  proto.uniformMatrix4fv=function(l,t,data){if(kind(this.canvas)==='hero'&&names.get(l)==='viewMatrix')window.__interaction.camera=-data[14];return matrix.call(this,l,t,data)}
  const clear=proto.clear
  proto.clear=function(...a){const k=kind(this.canvas);if(k&&!this.getParameter(this.FRAMEBUFFER_BINDING))window.__interaction.frames[k]=(window.__interaction.frames[k]||0)+1;return clear.apply(this,a)}
  for(const name of ['drawElementsInstanced','drawArraysInstanced']){const draw=proto[name];proto[name]=function(...a){const count=a.at(-1);if(kind(this.canvas)==='cube'&&[17,26].includes(count)){const all=window.__interaction.batches;if(all.at(-1)?.count!==count)all.push({count,at:performance.now()})}return draw.apply(this,a)}}
  const sample=()=>{window.__interaction.maxActive=Math.max(window.__interaction.maxActive,document.querySelectorAll('[data-scene-running="true"]').length);requestAnimationFrame(sample)};requestAnimationFrame(sample)
 })
 await page.goto(url);await page.locator('[data-scene-status="ready"]').waitFor({timeout:20000});await page.evaluate(()=>document.documentElement.style.scrollBehavior='auto');await page.waitForTimeout(900)
 return{page,errors}
}
const surface=(page,kind)=>page.getByRole('button',{name:labels[kind],exact:true})
async function ready(page,kind){const el=surface(page,kind);await el.scrollIntoViewIfNeeded();await page.waitForFunction(label=>document.querySelector(`[aria-label="${label}"]`)?.getAttribute('aria-disabled')==='false',labels[kind],{timeout:20000});return el}
const opened=(page,kind)=>page.waitForFunction(k=>(window.__interaction.morph[k]?.[0]||0)>.75,kind,{timeout:5000})
const closed=(page,kind)=>page.waitForFunction(k=>window.__interaction.morph[k]&&window.__interaction.morph[k][0]<.002,kind,{timeout:6000})
try{
 const {page,errors}=await prepare({viewport:{width:1440,height:1000}})
 const hero=await ready(page,'hero');assert.equal(await hero.evaluate(e=>getComputedStyle(e).cursor),'pointer');await hero.hover();await page.waitForTimeout(400)
 assert(await hero.locator('.interaction-hint').evaluate(e=>Number(getComputedStyle(e).opacity)>.5),'First hover explains the interaction')
 await hero.click();await opened(page,'hero');await page.screenshot({path:'/tmp/nikolay-action-hero-desktop.png'})
 await hero.evaluate(e=>{for(let i=0;i<8;i++)e.click()});assert.equal(await hero.getAttribute('data-interaction-phase'),'active');await closed(page,'hero')
 console.log('PASS hero: real GPU morph, repeat input, hover hint, smooth return')
 const scroll=async value=>{await page.evaluate(v=>{const r=document.querySelector('.experience-track').getBoundingClientRect();scrollTo(0,scrollY+r.top+(r.height-innerHeight)*v)},value);await page.waitForTimeout(650);return page.evaluate(()=>window.__interaction.camera)}
 const first=await scroll(.05),near=await scroll(.5),inside=await scroll(.75)
 assert(first>6&&near<2&&inside< -3,'Real camera crosses the orbital geometry')
 assert.equal(await hero.getAttribute('aria-disabled'),'true');const before=await page.evaluate(()=>window.__interaction.morph.hero[0]);await hero.evaluate(e=>e.click());await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__interaction.morph.hero[0]),before,'Scroll locks click morph')
 await page.screenshot({path:'/tmp/nikolay-action-scroll.png'});await scroll(1);assert(await page.getByRole('link',{name:'Посмотреть сайт',exact:true}).count()===1)
 await scroll(0);assert.equal(await hero.getAttribute('aria-disabled'),'false');assert(Math.abs(await page.evaluate(()=>window.__interaction.camera)-7.4)<.01)
 console.log('PASS scroll: forward/back camera passage, click lock and projects arrival')
 for(const kind of ['signal','glass']){
  const el=await ready(page,kind);await el.focus();await page.keyboard.press('Enter');await opened(page,kind)
  await page.screenshot({path:`/tmp/nikolay-action-${kind}-desktop.png`});await el.click();await opened(page,kind);await closed(page,kind)
  await page.keyboard.press(' ');await opened(page,kind);await closed(page,kind)
  console.log('PASS',kind,': GPU deformation, pointer and Enter/Space, repeated input and return')
 }
 const cube=await ready(page,'cube');await cube.click();await cube.evaluate(e=>{for(let i=0;i<20;i++)e.click()});await page.waitForTimeout(4700)
 const batches=await page.evaluate(()=>window.__interaction.batches)
 assert(batches.filter(b=>b.count===17).length>=6,'Fast real layer turns are rendered')
 const turns=batches.slice(0,-1).flatMap((b,i)=>b.count===17&&batches[i+1].count===26?[batches[i+1].at-b.at]:[])
 assert(turns.some(t=>t>100&&t<650),'Quarter turns complete at the new fast timing')
 assert.equal(await page.locator('.accent-cube button').count(),0);await page.screenshot({path:'/tmp/nikolay-action-cube-desktop.png'})
 assert(await page.evaluate(()=>window.__interaction.maxActive)<=1,'One continuously active renderer')
 assert.deepEqual(errors,[]);await page.close();console.log('PASS cube: fast GPU layer turns, repeat clicks and no extra controls')
 const mobile=await prepare({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true})
 const m=mobile.page,h=await ready(m,'hero');await h.tap();await opened(m,'hero');await h.tap();await opened(m,'hero')
 assert.equal(await h.evaluate(e=>getComputedStyle(e).touchAction),'pan-y')
 const r=await h.boundingBox(),cdp=await m.context().newCDPSession(m),start=await m.evaluate(()=>scrollY),x=r.x+r.width*.5,y=Math.min(710,r.y+r.height*.7)
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]})
 for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*45}]})
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await m.waitForTimeout(600)
 assert((await m.evaluate(()=>scrollY))>start+60,'Touch gesture through the object still scrolls the page')
 for(const kind of ['signal','glass','cube']){const el=await ready(m,kind);await el.tap();if(kind!=='cube')await opened(m,kind);await m.waitForTimeout(100);assert.equal(await m.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await m.screenshot({path:`/tmp/nikolay-action-${kind}-mobile.png`})}
 assert.deepEqual(mobile.errors,[]);await m.close();console.log('PASS mobile: all objects accept taps, no overflow, vertical touch scrolling preserved')
 const reduced=await prepare({viewport:{width:390,height:844},reducedMotion:'reduce'})
 for(const kind of ['hero','signal','glass','cube']){
  const el=await ready(reduced.page,kind);await el.focus();await reduced.page.keyboard.press('Enter');await reduced.page.waitForTimeout(250)
  const before=await reduced.page.evaluate(k=>window.__interaction.frames[k]||0,kind);await reduced.page.waitForTimeout(500)
  assert((await reduced.page.evaluate(k=>window.__interaction.frames[k]||0,kind))-before<=1,'Reduced motion uses demand rendering')
  if(kind!=='cube')assert((await reduced.page.evaluate(k=>window.__interaction.morph[k]?.[0]||0,kind))<.001,'Reduced motion keeps shapes still')
 }
 assert.equal(await reduced.page.locator('.experience-pin').evaluate(e=>getComputedStyle(e).position),'relative')
 assert.deepEqual(reduced.errors,[]);await reduced.page.close();console.log('PASS reduced motion: static click response, keyboard activation, no continuous rendering or pinned passage')
 await writeFile('/tmp/nikolay-interaction-check.json',JSON.stringify({camera:[first,near,inside],cubeQuarterTurnMs:turns,passed:true},null,2))
}finally{await browser.close()}
