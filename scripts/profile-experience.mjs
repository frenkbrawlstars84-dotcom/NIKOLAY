import {chromium} from 'playwright'
import {writeFile} from 'node:fs/promises'
const url=process.argv[2]||'http://127.0.0.1:4173'
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--enable-unsafe-swiftshader']})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1}),errors=[]
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
 await page.addInitScript(()=>{
  window.__profile={selector:null,frames:[],intro:[],longTasks:[],start:0,maxActive:0}
  const clear=WebGL2RenderingContext.prototype.clear
  WebGL2RenderingContext.prototype.clear=function(...a){const p=window.__profile;if(!this.getParameter(this.FRAMEBUFFER_BINDING)){if(this.canvas.closest('.portal-canvas'))p.intro.push([document.querySelector('.cosmic-intro')?.dataset.introStage,performance.now()]);if(p.selector&&this.canvas.closest(p.selector))p.frames.push(performance.now())}return clear.apply(this,a)}
  try{new PerformanceObserver(list=>{for(const e of list.getEntries())if(e.startTime>=window.__profile.start)window.__profile.longTasks.push(e.duration)}).observe({type:'longtask',buffered:false})}catch{}
  const check=()=>{window.__profile.maxActive=Math.max(window.__profile.maxActive,document.querySelectorAll('[data-scene-running="true"]').length);requestAnimationFrame(check)};requestAnimationFrame(check)
 })
 await page.goto(url);await page.locator('.cosmic-intro').waitFor({state:'detached',timeout:11000});await page.locator('[data-scene-status="ready"]').waitFor({timeout:20000});await page.evaluate(()=>document.documentElement.style.scrollBehavior='auto')
 const renderer=await page.locator('.experience-art canvas').evaluate(c=>{const g=c.getContext('webgl2'),d=g.getExtension('WEBGL_debug_renderer_info');return g.getParameter(d?d.UNMASKED_RENDERER_WEBGL:g.RENDERER)})
 const summarize=(times,duration)=>{const gaps=times.slice(1).map((t,i)=>t-times[i]).sort((a,b)=>a-b);return{frames:times.length,durationMs:duration,fps:times.length*1000/duration,medianMs:gaps[Math.floor(gaps.length*.5)],p95Ms:gaps[Math.floor(gaps.length*.95)]}}
 const results=[]
 const sample=async(name,selector)=>{
  await page.evaluate(value=>{window.__profile.selector=value;window.__profile.frames=[];window.__profile.longTasks=[];window.__profile.start=performance.now()},selector)
  await page.waitForTimeout(2500)
  const r=await page.evaluate(()=>{const p=window.__profile;p.selector=null;return{times:p.frames,duration:performance.now()-p.start,longTasks:p.longTasks}})
  const result={name,...summarize(r.times,r.duration),longTasks:r.longTasks};results.push(result);console.log(name,{fps:result.fps,medianMs:result.medianMs,p95Ms:result.p95Ms})
 }
 for(const [kind,label,selector] of [['hero','Раскрыть орбитальный объект','.experience-art'],['signal','Расплести хромированный узел','.accent-signal'],['glass','Разобрать и собрать стеклянный многогранник','.accent-glass'],['cube','Кубик Рубика: перемешать и собрать','.accent-cube']]){
  const surface=page.getByRole('button',{name:label,exact:true});await surface.scrollIntoViewIfNeeded();await page.waitForFunction(label=>document.querySelector(`[aria-label="${label}"]`)?.getAttribute('aria-disabled')==='false',label,{timeout:20000});await surface.focus();await page.waitForTimeout(600)
  await sample(`${kind}:idle`,selector);await surface.click();await sample(`${kind}:active`,selector)
 }
 const screens=page.locator('.project-screens');await screens.scrollIntoViewIfNeeded();await page.locator('.project-screens[data-screen-status="ready"]').waitFor();await page.waitForTimeout(600);await sample('projects:idle','.project-screens')
 const rect=await screens.boundingBox();await page.mouse.move(rect.x+rect.width*.8,rect.y+rect.height*.3);await sample('projects:hover','.project-screens')
 const intro=await page.evaluate(()=>window.__profile.intro),stages={}
 for(const stage of ['black-hole','plunge','galaxies','arrival']){const t=intro.filter(f=>f[0]===stage).map(f=>f[1]);stages[stage]=summarize(t,t.length>1?t.at(-1)-t[0]:1)}
 const maxActive=await page.evaluate(()=>window.__profile.maxActive)
 const report={environment:'Chromium; actual renderer below; no screenshot or readPixels during samples',renderer,viewport:{width:1440,height:1000},stages,results,maxActive,errors}
 await writeFile('/tmp/nikolay-experience-profile.json',JSON.stringify(report,null,2));console.log({maxActive,errors,report:'/tmp/nikolay-experience-profile.json'})
}finally{await browser.close()}
