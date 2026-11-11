import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
let server
const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '/usr/bin/chromium',args:['--enable-unsafe-swiftshader']})
const url=process.env.INTRO_TEST_URL || 'http://127.0.0.1:5177'
try {
  if(!process.env.INTRO_TEST_URL) {
    server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5177','--strictPort'],{stdio:['ignore','pipe','pipe']})
    let output='';server.stdout.on('data',v=>output+=v);server.stderr.on('data',v=>output+=v)
    let ready=false
    for(let i=0;i<100;i++) {
      if(server.exitCode!==null) throw new Error(output)
      try {if((await fetch(url)).ok){ready=true;break}} catch {}
      await new Promise(resolve=>setTimeout(resolve,100))
    }
    assert(ready,'Intro test server starts')
  }
  for(const mobile of [false,true]) {
    const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile})
    const page=await context.newPage(),errors=[]
    page.on('pageerror',e=>errors.push(e.message))
    await page.addInitScript(()=>{
      window.__portalFrames=[]
      window.__portalTargets=[]
      const image=WebGL2RenderingContext.prototype.texImage2D
      WebGL2RenderingContext.prototype.texImage2D=function(...args){if(typeof args[3]==='number'&&typeof args[4]==='number')window.__portalTargets.push([args[3],args[4]]);return image.apply(this,args)}
      new MutationObserver(()=>{if(!document.querySelector('.cosmic-intro')&&document.querySelector('h1')&&!window.__released)window.__released=performance.now()}).observe(document,{childList:true,subtree:true})
      const names=new WeakMap(),location=WebGL2RenderingContext.prototype.getUniformLocation
      WebGL2RenderingContext.prototype.getUniformLocation=function(program,name){const value=location.call(this,program,name);if(value)names.set(value,name);return value}
      const original=WebGL2RenderingContext.prototype.uniform3f
      WebGL2RenderingContext.prototype.uniform3f=function(location,x,y,z){if(names.get(location)==='uEye')window.__portalFrames.push([performance.now(),x,y,z]);return original.call(this,location,x,y,z)}
    })
    await page.goto(url,{waitUntil:'domcontentloaded'})
    await page.locator('.cosmic-intro[data-intro-state="playing"]').waitFor()
    assert.equal(await page.locator('.site-root').count(),0,'Main WebGL scenes are deferred during intro')
    const dimensions=await page.locator('.portal-canvas canvas').evaluate(e=>({width:e.width,height:e.height,cssWidth:e.clientWidth,cssHeight:e.clientHeight}))
    assert(dimensions.width>=dimensions.cssWidth&&dimensions.height>=dimensions.cssHeight,'Native canvas resolution')
    assert(await page.evaluate(({width,height})=>window.__portalTargets.some(([w,h])=>w===width&&h===height),dimensions),'Black hole buffer matches full canvas resolution')
    const cdp=await context.newCDPSession(page)
    const shot=await cdp.send('Page.captureScreenshot',{format:'png'})
    await writeFile(`/tmp/nikolay-intro-${mobile?'mobile':'desktop'}.png`,Buffer.from(shot.data,'base64'))
    await page.locator('.cosmic-intro').waitFor({state:'detached',timeout:8000})
    const duration=await page.evaluate(()=>window.__released)
    assert(duration<8000,'Intro always releases site')
    assert(await page.locator('h1').isVisible())
    assert.equal(await page.locator('.site-root').evaluate(e=>e.inert),false)
    assert.equal(await page.evaluate(()=>document.body.style.overflow),'')
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
    await page.waitForTimeout(900)
    const site=await cdp.send('Page.captureScreenshot',{format:'png'})
    await writeFile(`/tmp/nikolay-site-${mobile?'mobile':'desktop'}.png`,Buffer.from(site.data,'base64'))
    const frames=await page.evaluate(()=>window.__portalFrames)
    assert(frames.length>3,'Multiple real camera positions rendered')
    assert(Math.max(...frames.map(f=>f[3]))-Math.min(...frames.map(f=>f[3]))>10,'Camera moves through world space')
    await page.reload()
    assert.equal(await page.locator('.cosmic-intro').count(),0,'Only once per session')
    assert.deepEqual(errors,[])
    console.log('PASS',mobile?'mobile':'desktop',{duration,dimensions})
    await context.close()
  }
  for(const mode of ['skip','escape','reduced','no-webgl','storage','module','context-lost','timeout','reduced-change','shader','hash']) {
    const context=await browser.newContext({reducedMotion:mode==='reduced'?'reduce':'no-preference'})
    if(mode==='module') {await context.route('**/src/PortalScene.tsx',r=>r.abort());await context.route('**/assets/PortalScene-*.js',r=>r.abort())}
    if(mode==='timeout') {await context.route('**/src/PortalScene.tsx',()=>{});await context.route('**/assets/PortalScene-*.js',()=>{})}
    const page=await context.newPage()
    if(mode==='no-webgl') await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:original.call(this,type,...args)}})
    if(mode==='shader') await page.addInitScript(()=>{const original=WebGL2RenderingContext.prototype.shaderSource;WebGL2RenderingContext.prototype.shaderSource=function(shader,source){return original.call(this,shader,source.includes('TON_RAY_SCENE')?'INVALID_SHADER':source)}})
    if(mode==='storage') await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('Disabled')};Storage.prototype.setItem=()=>{throw new Error('Disabled')}})
    await page.goto(mode==='hash'?`${url}/#contact`:url,{waitUntil:'domcontentloaded'})
    if(mode==='skip'||mode==='storage') await page.getByRole('button',{name:'Пропустить интро'}).click()
    if(mode==='context-lost') {await page.locator('[data-intro-state="playing"]').waitFor();await page.locator('.portal-canvas canvas').evaluate(e=>e.dispatchEvent(new Event('webglcontextlost',{cancelable:true})))}
    if(mode==='reduced-change') {await page.locator('.portal-canvas canvas').waitFor();await page.emulateMedia({reducedMotion:'reduce'})}
    if(mode==='escape') await page.keyboard.press('Escape')
    await page.locator('.cosmic-intro').waitFor({state:'detached',timeout:8000})
    assert(await page.locator('h1').isVisible())
    assert.equal(await page.locator('.site-root').evaluate(e=>e.inert),false)
    if(mode==='reduced') assert.equal(await page.locator('.portal-canvas canvas').count(),0)
    console.log('PASS',mode)
    await context.close()
  }
} finally {await browser.close();server?.kill()}
