import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { checkObjects } from './check-objects.mjs'

const servers=[]
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms))
async function serve(preview,port){
  const proc=spawn(process.execPath,['node_modules/vite/bin/vite.js',...(preview?['preview']:[]),'--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:['ignore','pipe','pipe']})
  servers.push(proc)
  let output=''
  proc.stdout.on('data',v=>{output+=v});proc.stderr.on('data',v=>{output+=v})
  const url=`http://127.0.0.1:${port}`
  for(let i=0;i<100;i++){
    if(proc.exitCode!==null)throw new Error(output)
    try{if((await fetch(url)).ok)return url}catch{/* starting */}
    await delay(100)
  }
  throw new Error(`Server did not start: ${output}`)
}
const sessionKey='nikolay:intro-seen'
async function pageWithoutIntro(browser,options={}){
  const page=await browser.newPage(options)
  await page.addInitScript(key=>sessionStorage.setItem(key,'1'),sessionKey)
  return page
}
function errorsOn(page){
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text())})
  return errors
}
async function content(page,url){
  if(url)await page.goto(url)
  await page.locator('.cosmic-intro').waitFor({state:'detached'})
  await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';window.scrollTo(0,0)})
  await page.locator('h1').waitFor()
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('h1 .fluid-line')).every(e=>e.dataset.typeReady==='true'))
  assert(await page.getByRole('heading',{level:1}).isVisible())
  assert(await page.locator('h1 .fluid-ink').evaluateAll(nodes=>nodes.every(e=>{
    const s=getComputedStyle(e);return s.filter==='none'&&s.transform==='none'&&s.clipPath==='none'
  })))
  assert.equal(await page.getByRole('navigation',{includeHidden:true}).count(),1)
  for(const id of ['projects','about','capabilities','contact'])assert.equal(await page.locator(`#${id}`).count(),1)
  for(const name of ['Связаться со мной','@yuniorqq','t.me/yuniorqq'])assert.equal(await page.getByRole('link',{name,exact:true}).getAttribute('href'),'https://t.me/yuniorqq')
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  assert.equal(await page.locator('.experience-track,.experience-pin,.ton-caption,.horizon-shade,.passage-guides').count(),0)
  assert.equal(await page.locator('.gallery-layout').evaluate(e=>getComputedStyle(e).position),'relative')
  assert.equal(await page.locator('.site-root').evaluate(e=>e.inert),false)
}
async function healthy(page,url){
  await content(page,url)
  await page.locator('[data-scene-status="ready"]').waitFor({timeout:15000})
}
async function firstVisit(browser,url){
  const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=errorsOn(page)
  await page.goto(url)
  await page.locator('.cosmic-intro').waitFor()
  assert.equal(await page.locator('.site-root').evaluate(e=>e.inert),true)
  await page.locator('.intro-ready').waitFor({timeout:1800})
  await page.waitForFunction(()=>document.querySelector('.cosmic-intro')?.dataset.introPhase==='flight')
  await page.waitForFunction(()=>document.querySelector('.cosmic-intro')?.dataset.introPhase==='reveal')
  await page.locator('.cosmic-intro').waitFor({state:'detached',timeout:3000})
  const elapsed=await page.evaluate(()=>performance.now())
  assert(elapsed>=5500&&elapsed<7500,`Intro finishes automatically in ~5.8s (observed ${elapsed}ms)`)
  assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),sessionKey),'1')
  assert.equal(await page.locator('.cosmic-intro canvas').count(),0,'Intro resources unmount after completion')
  assert.equal(await page.evaluate(()=>document.body.style.overflow),'')
  await healthy(page)
  await page.reload()
  await healthy(page)
  assert.equal(await page.locator('.cosmic-intro').count(),0,'Same-session reload skips intro')
  // Forced previews do not modify the normal session flag.
  await page.goto(`${url}/?previewIntro=1`)
  await page.getByRole('button',{name:'Пропустить'}).click()
  assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),sessionKey),'1')
  await page.evaluate(key=>sessionStorage.removeItem(key),sessionKey)
  await page.reload()
  await page.getByRole('button',{name:'Пропустить'}).click()
  assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),sessionKey),null)
  await page.goto(url)
  await page.getByRole('button',{name:'Пропустить'}).click()
  assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),sessionKey),'1')
  assert.deepEqual(errors,[])
  await page.close()
  console.log(`PASS ${url}: first visit, black-hole/flight/reveal, automatic completion, session reload, skip and isolated preview`)
}
async function navigation(page,url){
  await healthy(page,url)
  for(const [name,destination] of [['AURA BEAUTY','https://amazing-pony-95fbe1.netlify.app/'],['NEXORA DIGITAL','https://lambent-pudding-e679ea.netlify.app/']]){
    await page.locator('.gallery-index').getByRole('button',{name:new RegExp(name)}).click()
    await page.waitForFunction(name=>document.querySelector('.project-plane.is-active h3')?.textContent===name,name)
    const link=page.getByRole('link',{name:'Посмотреть сайт',exact:true})
    assert.equal(await link.getAttribute('href'),destination)
    await page.route(destination,route=>route.fulfill({status:200,contentType:'text/html',body:'<title>Project navigation</title><p>Project reached</p>'}))
    await Promise.all([page.waitForURL(destination),link.click()])
    assert(await page.getByText('Project reached').isVisible())
    await page.unroute(destination)
    await healthy(page,url)
  }
  await page.locator('.gallery-index').getByRole('button',{name:/YOUR NEXT IDEA/}).click()
  assert.equal(await page.getByRole('link',{name:'Обсудить идею',exact:true}).getAttribute('href'),'#contact')
  await page.getByRole('link',{name:'Обсудить идею',exact:true}).click()
  assert(await page.locator('#contact').isVisible())
}
let browser
try{
  const dev=await serve(false,5175),preview=await serve(true,4175)
  browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--enable-unsafe-swiftshader']})
  for(const url of [dev,preview]){
    await firstVisit(browser,url)
    const page=await pageWithoutIntro(browser,{viewport:{width:1440,height:1000}}),errors=errorsOn(page)
    await healthy(page,url)
    const hero=page.locator('.scene-host')
    await hero.click()
    assert.equal(await hero.getAttribute('data-morphed'),'true')
    await page.mouse.move(1100,400);await page.waitForTimeout(300)
    await hero.press('Enter')
    assert.equal(await hero.getAttribute('data-morphed'),'false')
    // Native scroll never changes the camera or creates a second cosmic scene.
    for(const id of ['projects','about','capabilities','contact','main']){
      await page.locator(`#${id}`).scrollIntoViewIfNeeded()
      await page.waitForTimeout(150)
      assert.equal(await page.locator('.cosmic-intro').count(),0)
    }
    await navigation(page,url)
    await page.setViewportSize({width:390,height:844})
    await healthy(page,url)
    await page.getByRole('button',{name:'Открыть меню'}).click()
    await page.getByRole('navigation').getByRole('link',{name:'Контакты'}).click()
    await page.getByRole('link',{name:'Связаться со мной',exact:true}).click({trial:true})
    for(const width of [390,320]){
      await page.setViewportSize({width,height:844})
      await page.locator('.accent-cube').scrollIntoViewIfNeeded()
      await page.waitForTimeout(350)
      assert(await page.evaluate(()=>{
        const cube=document.querySelector('.accent-cube').getBoundingClientRect(),address=document.querySelector('.telegram-address').getBoundingClientRect()
        return cube.bottom<address.top&&Math.abs(cube.x+cube.width/2-innerWidth/2)<2&&document.documentElement.scrollWidth<=innerWidth
      }),`Cube/Telegram stack without overlap or overflow at ${width}px`)
    }
    assert.deepEqual(errors,[])
    await page.close()
    console.log(`PASS ${url}: stable hero interaction, ordinary scroll, both project links, idea CTA, mobile menu and contacts`)
  }
  for(const failure of ['intro-module','intro-timeout','intro-no-webgl','intro-shader','intro-context']){
    const page=await browser.newPage({viewport:{width:390,height:844}})
    if(failure==='intro-module')await page.route('**/assets/IntroScene-*.js',route=>route.abort())
    if(failure==='intro-timeout')await page.route('**/assets/IntroScene-*.js',()=>{})
    if(failure==='intro-no-webgl')await page.addInitScript(()=>{
      const original=HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind.startsWith('webgl')?null:original.call(this,kind,...args)}
    })
    if(failure==='intro-shader')await page.addInitScript(()=>{
      const original=WebGL2RenderingContext.prototype.shaderSource
      WebGL2RenderingContext.prototype.shaderSource=function(shader,source){return original.call(this,shader,source.includes('TON_RAY_SCENE')?'INVALID_SHADER':source)}
    })
    await page.goto(preview)
    if(failure==='intro-context'){
      await page.locator('.intro-ready').waitFor()
      await page.evaluate(()=>document.querySelector('.cosmic-intro canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext())
    }
    await content(page)
    assert.equal(await page.evaluate(()=>document.body.style.overflow),'')
    await page.close()
    console.log(`PASS ${failure}: automatically reveals usable main site`)
  }
  for(const failure of ['no-webgl','module','shader','context-lost','timeout']){
    const page=await pageWithoutIntro(browser,{viewport:{width:390,height:844}})
    if(failure==='module')await page.route('**/assets/Scene-*.js',route=>route.abort())
    if(failure==='timeout')await page.route('**/assets/Scene-*.js',()=>{})
    if(failure==='no-webgl')await page.addInitScript(()=>{
      const original=HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind.startsWith('webgl')?null:original.call(this,kind,...args)}
    })
    if(failure==='shader')await page.addInitScript(()=>{
      const original=WebGL2RenderingContext.prototype.shaderSource
      WebGL2RenderingContext.prototype.shaderSource=function(shader,source){return original.call(this,shader,source.includes('uMorph')?'INVALID_SHADER':source)}
    })
    await page.goto(preview)
    if(failure==='context-lost'){
      await healthy(page)
      await page.evaluate(()=>document.querySelector('.hero-visual canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext())
    }
    await page.locator('[data-scene-status="fallback"]').waitFor({timeout:15000})
    await content(page)
    assert(await page.locator('.scene-fallback').isVisible())
    await page.close()
    console.log(`PASS hero ${failure}: decoration falls back without losing content`)
  }
  {
    const page=await browser.newPage({reducedMotion:'reduce'})
    await page.goto(`${preview}/?previewIntro=1`)
    assert.equal(await page.locator('.cosmic-intro').count(),0)
    await healthy(page)
    assert.equal(await page.locator('[data-scene-running="true"]').count(),0)
    await page.close()
    console.log('PASS reduced motion: direct main site, no continuous rendering')
  }
  {
    const page=await pageWithoutIntro(browser,{viewport:{width:390,height:844}}),errors=errorsOn(page)
    await page.addInitScript(()=>{
      window.__cubeStats={counts:[],frames:0,uploads:0}
      for(const method of ['drawElementsInstanced','drawArraysInstanced']){
        const original=WebGL2RenderingContext.prototype[method]
        WebGL2RenderingContext.prototype[method]=function(...args){
          if(this.canvas.closest('.accent-cube')){window.__cubeStats.counts.push(args.at(-1));window.__cubeStats.frames++}
          return original.apply(this,args)
        }
      }
      const original=WebGL2RenderingContext.prototype.bufferSubData
      WebGL2RenderingContext.prototype.bufferSubData=function(...args){if(this.canvas.closest('.accent-cube'))window.__cubeStats.uploads++;return original.apply(this,args)}
    })
    await healthy(page,preview)
    await page.locator('.accent-cube').scrollIntoViewIfNeeded()
    await page.locator('.accent-cube[data-accent-status="ready"]').waitFor()
    assert.equal(await page.locator('.accent-cube button').count(),0)
    await page.waitForFunction(()=>[26,54,17,9,33,21].every(n=>window.__cubeStats.counts.includes(n)),null,{timeout:10000})
    await page.getByRole('button',{name:'Приостановить анимации',exact:true}).evaluate(e=>e.click())
    await page.waitForTimeout(300)
    const before=await page.evaluate(()=>({...window.__cubeStats}))
    await page.waitForTimeout(500)
    assert.deepEqual(await page.evaluate(()=>({...window.__cubeStats})),before,'Pause stops drawing and buffer uploads')
    await page.getByRole('button',{name:'Продолжить анимации',exact:true}).evaluate(e=>e.click())
    await page.waitForFunction(frames=>window.__cubeStats.frames>frames,before.frames)
    await page.emulateMedia({reducedMotion:'reduce'})
    await page.waitForTimeout(300)
    const stopped=await page.evaluate(()=>window.__cubeStats.frames)
    await page.waitForTimeout(600)
    assert((await page.evaluate(()=>window.__cubeStats.frames))-stopped<=6)
    assert.deepEqual(errors,[])
    await page.close()
    console.log('PASS cube: real 17+9 layer batches, 54 white stickers, pause/resume and reduced motion')
  }
  await checkObjects(browser,preview)
  console.log('All browser regressions passed.')
}finally{await browser?.close();for(const server of servers)server.kill('SIGTERM')}
