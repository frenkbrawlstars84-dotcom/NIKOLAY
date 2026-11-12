import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
const KEY='nikolay:intro:seen:v1'

export async function checkIntro(browser,url){
 for(const [name,viewport] of [['desktop',{width:1280,height:800}],['mobile',{width:390,height:844}]]){
  const context=await browser.newContext({viewport,hasTouch:name==='mobile'})
  try{
   await context.addInitScript(()=>{
    // Explicitly clear the session once, before the app's first script. Keep
    // subsequent reloads intact so the real once-per-session contract is tested.
    if(!sessionStorage.getItem('__intro_test_prepared')){
      sessionStorage.clear();sessionStorage.setItem('__intro_test_prepared','1')
      sessionStorage.setItem('nikolayIntroSeen','1');sessionStorage.setItem('introPlayed','1')
    }
    window.__introGPU={draws:0,framebuffers:0,textures:0,lost:0,targets:[],luminous:false}
    const proto=WebGL2RenderingContext.prototype
    const source=proto.shaderSource
    proto.shaderSource=function(shader,text){if(text.includes('TON_RAY_SCENE')){this.canvas.dataset.blackHoleShader='true';this.canvas.addEventListener('webglcontextlost',()=>window.__introGPU.lost++)}return source.call(this,shader,text)}
    for(const method of ['drawArrays','drawElements']){
      const original=proto[method]
      proto[method]=function(...args){
        const result=original.apply(this,args)
        if(this.canvas.dataset.scene==='intro'){
          window.__introGPU.draws++
          if(this.getParameter(this.FRAMEBUFFER_BINDING)&&!window.__introGPU.luminous){
            const size=this.getParameter(this.VIEWPORT),pixels=new Uint8Array(4*32)
            this.readPixels(Math.floor(size[2]*.2),Math.floor(size[3]*.48),32,1,this.RGBA,this.UNSIGNED_BYTE,pixels)
            window.__introGPU.luminous=pixels.some((v,i)=>i%4!==3&&v>45)
          }
        }
        return result
      }
    }
    for(const [method,field] of [['deleteFramebuffer','framebuffers'],['deleteTexture','textures']]){
      const original=proto[method]
      proto[method]=function(...args){if(this.canvas.dataset.scene==='intro')window.__introGPU[field]++;return original.apply(this,args)}
    }
    const image=proto.texImage2D
    proto.texImage2D=function(...args){if(this.canvas.closest('.opening-intro')&&args.length===9&&args[3]>1&&args[4]>1)window.__introGPU.targets.push([args[3],args[4]]);return image.apply(this,args)}
   })
   const page=await context.newPage(),errors=[]
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
   await page.goto(url)
   await page.locator('.opening-intro[data-intro-phase="black-hole"]').waitFor()
   assert.equal(await page.locator('.site-root,h1').count(),0,'Hero is not mounted before the first intro')
   assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),KEY),null,'Legacy flags and StrictMode do not mark this session seen')
   assert(await page.getByRole('button',{name:/Пропустить/}).isVisible())
   await page.locator('.opening-intro[data-intro-renderer="ready"]').waitFor({timeout:20000})
   const canvas=page.locator('.opening-intro canvas')
   assert.equal(await canvas.getAttribute('data-black-hole-shader'),'true')
   assert(await page.evaluate(()=>{const c=document.querySelector('.opening-intro canvas');return window.__introGPU.targets.some(([w,h])=>w===c.width&&h===c.height)}),'Disk is rendered at native canvas resolution')
   await page.locator('.opening-intro[data-intro-phase="galaxies"]').waitFor({timeout:30000})
   assert.equal(await page.locator('h1').count(),0,'Hero stays absent during the star flight')
   assert(await page.evaluate(()=>window.__introGPU.luminous),'Intro actually draws the luminous accretion disk')
   assert(Number(await canvas.getAttribute('data-intro-distance'))<0,'Camera has crossed the original hole and continues forward')
   await page.locator('.opening-intro').waitFor({state:'detached',timeout:30000})
   await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.portfolio-entry')).opacity)>.99)
   assert(await page.getByRole('heading',{level:1}).isVisible())
   assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),KEY),'1')
   assert.equal(await page.evaluate(()=>document.body.style.overflow),'')
   await page.waitForTimeout(700)
   const gpu=await page.evaluate(()=>({...window.__introGPU}))
   assert(gpu.draws>0&&gpu.framebuffers>0&&gpu.textures>0,'Intro render targets and textures are disposed')
   assert(gpu.lost>0,'Unmount releases the intro WebGL context')
   await page.waitForTimeout(200)
   assert.equal(await page.evaluate(()=>window.__introGPU.draws),gpu.draws,'Detached intro never renders again')
   await page.locator('[data-scene-status="ready"]').waitFor()
   for(const progress of [.3,.6,.9,0]){
    await page.evaluate(value=>{document.documentElement.style.scrollBehavior='auto';const r=document.querySelector('.experience-track').getBoundingClientRect();scrollTo(0,scrollY+r.top+(r.height-innerHeight)*value)},progress)
    await page.waitForTimeout(200)
   }
   assert.equal(await page.locator('.experience-art canvas').getAttribute('data-black-hole-shader'),null,'Only the energy portal is present during scroll')
   assert.equal(await page.locator('.opening-intro,.ton-caption,.horizon-shade').count(),0)
   for(const label of ['AURA BEAUTY','NEXORA DIGITAL','YOUR NEXT IDEA'])assert(await page.locator('.gallery-index').getByRole('button',{name:new RegExp(label)}).count())
   assert.equal(await page.getByRole('link',{name:'@yuniorqq',exact:true}).getAttribute('href'),'https://t.me/yuniorqq')
   const introRequests=[]
   page.on('request',request=>{if(/\/IntroCanvas-/.test(request.url()))introRequests.push(request.url())})
   await page.reload();await page.locator('h1').waitFor()
   assert.equal(await page.locator('.opening-intro').count(),0,'Same-session reload starts at hero')
   assert.equal(introRequests.length,0,'Repeated visits do not load the intro renderer')
   await page.goto(`${url}/?previewIntro=1`)
   await page.locator('.opening-intro[data-intro-phase="black-hole"]').waitFor()
   assert.equal(await page.locator('h1').count(),0,'Force preview overrides the stored session flag')
   await page.getByRole('button',{name:/Пропустить/}).click()
   await page.locator('h1').waitFor()
   assert.equal(await page.locator('.opening-intro').count(),0,'Skip removes the entire overlay')
   assert.equal(await page.evaluate(()=>document.body.style.overflow),'')
   assert.deepEqual(errors,[])
   console.log(`PASS ${name}: cleared session → black hole → galaxies → hero; scroll portal only; repeat skips; preview forces; skip and GPU disposal`)
  }finally{await context.close()}
 }
 // Storage denial must not throw or make the finite fallback impossible to skip.
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'})
 try{
  await context.addInitScript(()=>{Object.defineProperty(window,'sessionStorage',{get(){throw new DOMException('Storage denied','SecurityError')}})})
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.route('**/assets/IntroCanvas-*.js',route=>route.abort())
  await page.goto(url)
  await page.locator('.opening-intro').waitFor()
  assert.equal(await page.locator('h1').count(),0)
  await page.getByRole('button',{name:/Пропустить/}).click()
  await page.locator('h1').waitFor()
  assert.deepEqual(errors,[])
  console.log('PASS blocked storage/import: visible intro, skip, accessible hero')
 }finally{await context.close()}
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4178','--strictPort'],{stdio:'pipe'})
 let browser
 try{
  const url='http://127.0.0.1:4178';let ready=false
  for(let i=0;i<80;i++){if(server.exitCode!==null)throw new Error('Intro preview exited');try{if((await fetch(url)).ok){ready=true;break}}catch{}await new Promise(resolve=>setTimeout(resolve,100))}
  if(!ready)throw new Error('Intro preview did not start')
  browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--enable-unsafe-swiftshader']})
  await checkIntro(browser,url)
 }finally{await browser?.close();server.kill('SIGTERM')}
}
