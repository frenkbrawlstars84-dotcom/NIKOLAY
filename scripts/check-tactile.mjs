import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
const url=process.argv[2]||'http://127.0.0.1:4176'
const server=process.argv[2]?null:spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4176','--strictPort'],{stdio:'pipe'})
if(server){
 let ready=false
 for(let i=0;i<80;i++){
  if(server.exitCode!==null)throw new Error('Tactile test preview failed to start')
  try{if((await fetch(url)).ok){ready=true;break}}catch{}
  await new Promise(resolve=>setTimeout(resolve,100))
 }
 if(!ready){server.kill('SIGTERM');throw new Error('Tactile test preview did not become ready')}
}
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--enable-unsafe-swiftshader']})
let currentPage
try {
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},hasTouch:mobile})
  currentPage=page
  const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack)});page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error(m.text())}})
  await page.addInitScript(()=>sessionStorage.setItem('nikolay:intro:seen:v1','1'))
  await page.goto(url);await page.locator('[data-scene-status="ready"]').waitFor();await page.evaluate(()=>document.documentElement.style.scrollBehavior='auto')
  const press=async locator=>mobile?locator.tap():locator.click()
  const check=async locator=>{
   console.log('CHECK',mobile?'mobile':'desktop',await locator.getAttribute('aria-label'))
   await locator.scrollIntoViewIfNeeded();await locator.waitFor()
   if(!mobile){await locator.hover();await page.waitForFunction(el=>el.dataset.interaction==='HOVER',await locator.elementHandle())}
   await press(locator);await page.waitForFunction(el=>Number(el.dataset.morph)>.98,await locator.elementHandle())
   for(let i=0;i<5;i++)await press(locator)
   await page.waitForFunction(el=>Number(el.dataset.morph)===0,await locator.elementHandle())
   await locator.focus();await page.keyboard.press('Enter');await page.waitForFunction(el=>Number(el.dataset.morph)>.98,await locator.elementHandle())
   await page.keyboard.press('Escape');await page.waitForFunction(el=>Number(el.dataset.morph)===0,await locator.elementHandle())
  }
  await check(page.locator('.portal-interaction'))
  // Scroll takes ownership, disables the click target and stays reversible.
  await page.evaluate(()=>{const r=document.querySelector('.experience-track').getBoundingClientRect();scrollTo(0,scrollY+r.top+(r.height-innerHeight)*.64)})
  await page.waitForFunction(()=>document.querySelector('.portal-interaction').disabled)
  await page.evaluate(()=>scrollTo(0,0));await page.locator('.portal-interaction:enabled').waitFor()
  for(const kind of ['signal','glass']){
   await page.locator(`.accent-${kind}`).scrollIntoViewIfNeeded();await page.locator(`.accent-${kind}[data-accent-status="ready"]`).waitFor()
   await check(page.locator(`.accent-${kind} canvas`))
  }
  await page.locator('.gallery-index').getByRole('button',{name:/NEXORA DIGITAL/}).evaluate(e=>e.click())
  await page.waitForFunction(()=>document.querySelector('.project-plane.is-active h3')?.textContent==='NEXORA DIGITAL');await page.waitForTimeout(1000)
  await page.locator('.project-screens').scrollIntoViewIfNeeded();await page.locator('.project-screens[data-screen-status="ready"]').waitFor()
  await check(page.locator('.project-screens canvas'))
  assert.equal(await page.getByRole('link',{name:'Посмотреть сайт',exact:true}).getAttribute('href'),'https://lambent-pudding-e679ea.netlify.app/')
  await page.locator('.gallery-index').getByRole('button',{name:/YOUR NEXT IDEA/}).evaluate(e=>e.click())
  await page.waitForFunction(()=>document.querySelector('.project-plane.is-active h3')?.textContent==='YOUR NEXT IDEA')
  assert.equal(await page.getByRole('link',{name:'Обсудить мою идею',exact:true}).getAttribute('href'),'https://t.me/yuniorqq')
  await page.locator('.accent-cube').scrollIntoViewIfNeeded();await page.locator('.accent-cube[data-accent-status="ready"]').waitFor()
  const cube=page.locator('.accent-cube canvas'),turns=Number(await cube.getAttribute('data-cube-turns'))
  await press(cube);await press(cube);await press(cube)
  await page.waitForFunction(({el,turns})=>el.dataset.cubeSolved==='true'&&Number(el.dataset.cubeTurns)>turns,{el:await cube.elementHandle(),turns},{timeout:20000})
  assert.equal(await page.locator('.accent-cube button').count(),0)
  assert.equal(await page.getByRole('link',{name:'@yuniorqq',exact:true}).getAttribute('href'),'https://t.me/yuniorqq')
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.locator('.accent-glass').scrollIntoViewIfNeeded();await check(page.locator('.accent-glass canvas'))
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  assert.deepEqual(errors,[])
  console.log(`PASS ${mobile?'mobile touch':'desktop'}: reversible shapes, rapid clicks, keyboard, scroll ownership, projects, solved cube, reduced motion, Telegram`)
  await page.close()
 }
}catch(error){
 if(currentPage){console.error(await currentPage.locator('.accent-object').evaluateAll(nodes=>nodes.map(e=>({kind:e.className,status:e.dataset.accentStatus,canvas:!!e.querySelector('canvas')}))));await currentPage.screenshot({path:'/tmp/nikolay-tactile-failure.png'})}
 throw error
}finally{await browser.close();server?.kill('SIGTERM')}
