import{chromium}from'playwright'
import assert from'node:assert/strict'
import{writeFile}from'node:fs/promises'
const b=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--enable-unsafe-swiftshader']})
try{for(const mobile of [false,true]){
 const p=await b.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000}}),errors=[]
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
 await p.addInitScript(()=>{
 sessionStorage.setItem('nikolay-portal-seen-v1','1');window.__cameraZ=0;window.__rayCount=0
 const proto=WebGL2RenderingContext.prototype,names=new WeakMap(),loc=proto.getUniformLocation,mat=proto.uniformMatrix4fv,source=proto.shaderSource
 proto.getUniformLocation=function(program,name){const v=loc.call(this,program,name);if(v)names.set(v,name);return v}
 proto.uniformMatrix4fv=function(l,t,data){if(this.canvas.closest('.experience-art')&&names.get(l)==='modelViewMatrix')window.__cameraZ=data[14];return mat.call(this,l,t,data)}
 proto.shaderSource=function(shader,text){if(text.includes('PORTAL_BLACK_HOLE'))window.__rayCount++;return source.call(this,shader,text)}
 })
 await p.goto(process.env.IMMERSION_TEST_URL||'http://127.0.0.1:5190');await p.locator('[data-scene-status="ready"]').waitFor();await p.waitForTimeout(1000)
 const sample=async value=>{await p.evaluate(v=>{document.documentElement.style.scrollBehavior='auto';const r=document.querySelector('.experience-track').getBoundingClientRect();scrollTo(0,scrollY+r.top+(r.height-innerHeight)*v)},value);await p.waitForTimeout(700);return p.evaluate(()=>window.__cameraZ)}
 assert((await sample(0))< -6)
 const cdp=await p.context().newCDPSession(p)
 for(const value of [.2,.45,.6,.75,.95]){
  const z=await sample(value);console.log('PASS camera',mobile?'mobile':'desktop',value,z)
  if(value===.75)assert(z>3,'Camera actually passes the rear of the funnel')
  if(value===.6||value===.95){const shot=await cdp.send('Page.captureScreenshot',{format:'png'});await writeFile(`/tmp/nikolay-${value===.95?'projects-arrival':'through-portal'}-${mobile?'mobile':'desktop'}.png`,Buffer.from(shot.data,'base64'))}
 }
 assert(await p.locator('#projects').evaluate(e=>Number(getComputedStyle(e).opacity)>.7))
 assert(await p.locator('#projects .section-heading').evaluate(e=>e.getBoundingClientRect().top<innerHeight*.75),'Projects heading arrives inside the viewport, not below an empty exit')
 assert((await sample(0))< -6,'Backward scroll restores camera outside entrance')
 assert.equal(await p.locator('.hero-copy').evaluate(e=>e.inert),false)
 assert.equal(await p.evaluate(()=>window.__rayCount),0,'Energy journey compiles no black hole')
 await sample(.6);await p.setViewportSize(mobile?{width:390,height:900}:{width:1280,height:900});await p.waitForTimeout(500);assert(Number.isFinite(await p.evaluate(()=>window.__cameraZ)))
 await p.setViewportSize(mobile?{width:390,height:600}:{width:1280,height:600});await p.waitForTimeout(500);assert.equal(await p.locator('.site-root').evaluate(e=>e.classList.contains('journey-enabled')),false,'Short displays use normal scrolling')
 await p.setViewportSize(mobile?{width:390,height:844}:{width:1440,height:1000});await p.waitForTimeout(500);await sample(.6);await p.locator('.experience-art canvas').evaluate(c=>c.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext())
 await p.locator('[data-scene-status="fallback"]').waitFor()
 assert.equal(await p.locator('.site-root').evaluate(e=>e.classList.contains('journey-enabled')),false)
 await p.locator('#contact').scrollIntoViewIfNeeded();assert(await p.getByRole('link',{name:'@yuniorqq',exact:true}).isVisible())
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
 assert.deepEqual(errors.filter(e=>!e.includes('CONTEXT_LOST')),[])
 await p.close()
}}finally{await b.close()}
