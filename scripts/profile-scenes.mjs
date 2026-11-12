import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const tag=(process.argv[2]||'current').replace(/[^a-zA-Z0-9_-]/g,'_'),url=process.argv[3]||'http://localhost:4173'
const output=process.env.NIKOLAY_PROFILE_DIR||tmpdir()
await mkdir(output,{recursive:true})
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--enable-unsafe-swiftshader']})
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1})
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
  await page.addInitScript(()=>{
    sessionStorage.setItem('nikolay:intro:seen:v1','1')
    window.__profile={selector:null,frames:[],raf:[],longTasks:[],draws:0,start:0}
    for(const method of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){
      const original=WebGL2RenderingContext.prototype[method]
      WebGL2RenderingContext.prototype[method]=function(...args){const p=window.__profile;if(p.selector&&this.canvas.closest(p.selector))p.draws++;return original.apply(this,args)}
    }
    const targets=new WeakMap(),proto=WebGL2RenderingContext.prototype,bind=proto.bindFramebuffer,clear=proto.clear
    proto.bindFramebuffer=function(target,buffer){if(target===this.FRAMEBUFFER||target===this.DRAW_FRAMEBUFFER)targets.set(this,buffer);return bind.call(this,target,buffer)}
    proto.clear=function(mask){const p=window.__profile;if(p.selector&&this.canvas.closest(p.selector)&&!targets.get(this))p.frames.push(performance.now());return clear.call(this,mask)}
    try{new PerformanceObserver(list=>{for(const entry of list.getEntries())if(entry.startTime>=window.__profile.start)window.__profile.longTasks.push(entry.duration)}).observe({type:'longtask',buffered:false})}catch{}
    const tick=now=>{if(window.__profile.selector)window.__profile.raf.push(now);requestAnimationFrame(tick)};requestAnimationFrame(tick)
  })
  const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable')
  await page.goto(url);await page.locator('[data-scene-status="ready"]').waitFor({timeout:20000});await page.evaluate(()=>document.documentElement.style.scrollBehavior='auto')
  const renderer=await page.locator('.experience-art canvas').evaluate(c=>{const gl=c.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return{renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),gpuTimers:Boolean(gl.getExtension('EXT_disjoint_timer_query_webgl2'))}})
  const sample=async selector=>{
    const metrics=()=>cdp.send('Performance.getMetrics').then(r=>Object.fromEntries(r.metrics.map(x=>[x.name,x.value])))
    // Exclude first-use shader compilation and scroll settling from the sample.
    await page.evaluate(value=>{window.__profile={selector:value,frames:[],raf:[],longTasks:[],draws:0,start:performance.now()}},selector)
    await page.waitForFunction(()=>window.__profile.frames.length>=12,null,{timeout:60000})
    const before=await metrics()
    await page.evaluate(value=>{window.__profile={selector:value,frames:[],raf:[],longTasks:[],draws:0,start:performance.now()}},selector)
    await page.waitForTimeout(7000)
    const result=await page.evaluate(()=>{const p=window.__profile,end=performance.now();p.selector=null;const gaps=p.frames.slice(1).map((v,i)=>v-p.frames[i]).sort((a,b)=>a-b);return{durationMs:end-p.start,frames:p.frames.length,drawCallsPerFrame:p.draws/Math.max(1,p.frames.length),fps:p.frames.length*1000/(end-p.start),raf:p.raf.length,medianMs:gaps[Math.floor(gaps.length*.5)],p95Ms:gaps[Math.floor(gaps.length*.95)],longTasks:p.longTasks}})
    const after=await metrics();return{...result,scriptMs:(after.ScriptDuration-before.ScriptDuration)*1000,layoutMs:(after.LayoutDuration-before.LayoutDuration)*1000,taskMs:(after.TaskDuration-before.TaskDuration)*1000}
  }
  await page.evaluate(()=>{const r=document.querySelector('.experience-track').getBoundingClientRect();scrollTo(0,scrollY+r.top+(r.height-innerHeight)*.64)});await page.waitForTimeout(1200)
  const portal=await sample('.experience-art');await page.screenshot({path:join(output,`nikolay-portal-${tag}.png`)})
  await page.locator('.accent-cube').scrollIntoViewIfNeeded();await page.locator('.accent-cube[data-accent-status="ready"]').waitFor({timeout:20000});await page.waitForTimeout(1000)
  const cube=await sample('.accent-cube');await page.locator('.accent-cube').screenshot({path:join(output,`nikolay-cube-${tag}.png`)})
  const resources=await page.evaluate(()=>{const entries=performance.getEntriesByType('resource').filter(e=>e.name.startsWith(location.origin));return {requests:entries.length,decodedBytes:entries.reduce((s,e)=>s+e.decodedBodySize,0),transferBytes:entries.reduce((s,e)=>s+e.transferSize,0)}})
  const report={tag,renderer,portal,cube,resources,errors,reportPath:join(output,`nikolay-profile-${tag}.json`)};await writeFile(report.reportPath,JSON.stringify(report,null,2));console.log(JSON.stringify(report))
}finally{await browser.close()}
