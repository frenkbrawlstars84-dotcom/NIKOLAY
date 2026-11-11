import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { writeFile } from 'node:fs/promises'
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--enable-unsafe-swiftshader']})
const url=process.env.HERO_TEST_URL||'http://127.0.0.1:5190'
try{
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000}}),errors=[]
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
  await page.addInitScript(()=>{
   sessionStorage.setItem('nikolay-portal-seen-v1','1')
   window.__hero={pointer:[],time:0,frames:[],draws:0,frameDraws:0,maxDraws:0,particles:0}
   const p=WebGL2RenderingContext.prototype,names=new WeakMap(),loc=p.getUniformLocation
   p.getUniformLocation=function(program,name){const v=loc.call(this,program,name);if(v)names.set(v,name);return v}
   const one=p.uniform1f,two=p.uniform2f,clear=p.clear
   p.uniform1f=function(l,v){if(this.canvas.closest('.experience-art')&&names.get(l)==='uTime')window.__hero.time=v;return one.call(this,l,v)}
   p.uniform2f=function(l,x,y){if(this.canvas.closest('.experience-art')&&names.get(l)==='uPointer')window.__hero.pointer=[x,y];return two.call(this,l,x,y)}
   p.clear=function(...a){if(this.canvas.closest('.experience-art')){window.__hero.maxDraws=Math.max(window.__hero.maxDraws,window.__hero.frameDraws);window.__hero.frameDraws=0;window.__hero.frames.push(performance.now())}return clear.apply(this,a)}
   for(const method of ['drawArrays','drawElements']){const draw=p[method];p[method]=function(...a){if(this.canvas.closest('.experience-art')){window.__hero.draws++;window.__hero.frameDraws++;if(a[0]===this.POINTS)window.__hero.particles=a[2]}return draw.apply(this,a)}}
  })
  await page.goto(url);await page.locator('[data-scene-status="ready"]').waitFor();await page.waitForTimeout(1600)
  assert(await page.locator('.hero-description').isVisible());assert.equal(await page.locator('.experience-art canvas').count(),1)
  const area=await page.locator('.hero-visual').boundingBox(),copy=await page.locator('.hero-copy').boundingBox()
  assert(area&&copy&&(mobile?area.y>=copy.y+copy.height-1:area.x>=copy.x+copy.width),'Separate text and portal viewport')
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  await page.mouse.move(area.x+area.width*.8,area.y+area.height*.3);await page.waitForTimeout(200)
  const pointed=await page.evaluate(()=>window.__hero.pointer)
  assert(Math.hypot(...pointed)>.04,'GPU receives damped pointer movement')
  await page.waitForTimeout(2800);assert(Math.hypot(...await page.evaluate(()=>window.__hero.pointer))<.04,'Portal returns to natural motion when pointer rests')
  const cdp=await page.context().newCDPSession(page),shot=await cdp.send('Page.captureScreenshot',{format:'png'})
  await writeFile(join(tmpdir(),`nikolay-hero-portal-${mobile?'mobile':'desktop'}.png`),Buffer.from(shot.data,'base64'))
  const stats=await page.evaluate(()=>window.__hero)
  assert(stats.maxDraws<=4&&stats.maxDraws>0,'Four draw-call budget');assert.equal(stats.particles,mobile?240:720)
  assert(stats.time>1,'Animation actually advances on GPU')
  await page.getByRole('button',{name:'Приостановить анимации',exact:true}).click();await page.waitForTimeout(300)
  const stopped=await page.evaluate(()=>window.__hero.time);await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>window.__hero.time),stopped)
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(300);const count=await page.evaluate(()=>window.__hero.frames.length);await page.waitForTimeout(500);assert((await page.evaluate(()=>window.__hero.frames.length))-count<=1)
  assert.deepEqual(errors,[])
  const gaps=stats.frames.slice(1).map((t,i)=>t-stats.frames[i]).sort((a,b)=>a-b)
  console.log('PASS hero portal',mobile?'mobile':'desktop',{particles:stats.particles,drawCalls:stats.maxDraws,medianFrameMs:gaps[Math.floor(gaps.length/2)]})
  await page.close()
 }
}finally{await browser.close()}
