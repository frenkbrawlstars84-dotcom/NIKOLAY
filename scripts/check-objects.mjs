import assert from 'node:assert/strict'

export async function checkObjects(browser,url) {
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'})
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
  await page.addInitScript(()=>{
    window.__objects={matrices:{},frames:{},materials:{}}
    const names=new WeakMap(),proto=WebGL2RenderingContext.prototype
    const kind=canvas=>canvas.closest('.accent-signal')?'signal':canvas.closest('.accent-glass')?'glass':canvas.closest('.project-screens')?'screens':null
    const location=proto.getUniformLocation
    proto.getUniformLocation=function(program,name){const value=location.call(this,program,name);if(value)names.set(value,name);return value}
    const matrix=proto.uniformMatrix4fv
    proto.uniformMatrix4fv=function(location,transpose,data){const key=kind(this.canvas);if(key&&names.get(location)==='modelViewMatrix')window.__objects.matrices[key]=Array.from(data);return matrix.call(this,location,transpose,data)}
    const scalar=proto.uniform1f
    proto.uniform1f=function(location,value){const key=kind(this.canvas),name=names.get(location);if(key==='glass'&&['transmission','ior'].includes(name))window.__objects.materials[name]=value;return scalar.call(this,location,value)}
    const clear=proto.clear
    proto.clear=function(mask){const key=kind(this.canvas);if(key&&!this.getParameter(this.FRAMEBUFFER_BINDING))window.__objects.frames[key]=(window.__objects.frames[key]||0)+1;return clear.call(this,mask)}
  })
  await page.goto(url)
  await page.evaluate(()=>document.documentElement.style.scrollBehavior='auto')
  for(const kind of ['signal','glass']){
    const host=page.locator(`.accent-${kind}`)
    await host.scrollIntoViewIfNeeded();await page.locator(`.accent-${kind}[data-accent-status="ready"]`).waitFor({timeout:20000})
    await page.waitForFunction(key=>Boolean(window.__objects.matrices[key]),kind)
    const before=await page.evaluate(key=>window.__objects.matrices[key],kind)
    const canvas=host.locator('canvas');await canvas.focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(250)
    const after=await page.evaluate(key=>window.__objects.matrices[key],kind)
    assert(after.some((v,i)=>Math.abs(v-before[i])>.01),`${kind}: actual 3D transform responds to keyboard input`)
    const r=await canvas.boundingBox()
    await page.mouse.move(r.x+r.width*.35,r.y+r.height*.4);await page.mouse.down();await page.mouse.move(r.x+r.width*.7,r.y+r.height*.65,{steps:8});await page.mouse.up();await page.waitForTimeout(200)
    const dragged=await page.evaluate(key=>window.__objects.matrices[key],kind)
    assert(dragged.some((v,i)=>Math.abs(v-after[i])>.01),`${kind}: actual 3D transform responds to dragging`)
    assert.equal(await page.locator('.about-statement').count(),1)
    assert(await page.locator('#capabilities .lab').count()===5)
  }
  assert.equal(await page.evaluate(()=>window.__objects.materials.transmission),1)
  assert(await page.evaluate(()=>window.__objects.materials.ior)>1,'Glass shader really uses refraction')
  const screens=page.locator('.project-screens')
  await screens.scrollIntoViewIfNeeded();await page.locator('.project-screens[data-screen-status="ready"]').waitFor({timeout:20000})
  await page.locator('.gallery-index').getByRole('button',{name:/NEXORA DIGITAL/}).click()
  assert(await page.locator('.project-plane.is-active').getByText('ДЕМОНСТРАЦИОННЫЙ ПРОЕКТ',{exact:true}).isVisible())
  assert.equal(await page.getByRole('link',{name:'Посмотреть сайт',exact:true}).getAttribute('href'),'https://lambent-pudding-e679ea.netlify.app/')
  await page.emulateMedia({reducedMotion:'no-preference'})
  await screens.scrollIntoViewIfNeeded();await page.waitForTimeout(800)
  const before=await page.evaluate(()=>window.__objects.matrices.screens)
  const box=await screens.boundingBox();await page.mouse.move(box.x+box.width*.8,box.y+box.height*.25)
  await page.waitForTimeout(600)
  const tilted=await page.evaluate(()=>window.__objects.matrices.screens)
  assert(tilted.some((v,i)=>Math.abs(v-before[i])>.005),'Real project geometry tilts under the cursor')
  assert(await page.locator('[data-scene-running="true"]').count()<=1,'One continuous renderer at a time')
  await page.locator('.accent-glass').scrollIntoViewIfNeeded();await page.waitForTimeout(500)
  const stopped=await page.evaluate(()=>window.__objects.frames.screens)
  await page.waitForTimeout(800)
  assert((await page.evaluate(()=>window.__objects.frames.screens))-stopped<=1,'Offscreen project renderer stops')
  assert.deepEqual(errors,[])
  await page.close()
  const mobile=await browser.newPage({viewport:{width:390,height:844}})
  await mobile.addInitScript(()=>Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>2}))
  await mobile.goto(url);await mobile.evaluate(()=>document.documentElement.style.scrollBehavior='auto')
  for(const kind of ['screens','signal','glass']){
    const selector=kind==='screens'?'.project-screens':`.accent-${kind}`
    await mobile.locator(selector).scrollIntoViewIfNeeded()
    await mobile.locator(`${selector}[${kind==='screens'?'data-screen-status':'data-accent-status'}="ready"]`).waitFor({timeout:20000})
    const canvas=mobile.locator(`${selector} canvas`)
    assert.equal(await canvas.count(),1,'Weak devices keep real simplified 3D geometry')
    const dpr=await canvas.evaluate(c=>c.width/c.getBoundingClientRect().width)
    assert(dpr>=.99&&dpr<=1.26)
    assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
    assert(await mobile.locator('[data-scene-running="true"]').count()<=1)
  }
  await mobile.evaluate(()=>document.querySelector('.accent-glass canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext())
  await mobile.locator('.accent-glass[data-accent-status="fallback"]').waitFor()
  assert.equal(await mobile.getByRole('link',{name:'@yuniorqq',exact:true}).getAttribute('href'),'https://t.me/yuniorqq')
  assert.equal(await mobile.locator('h1').count(),1)
  await mobile.close()
  const broken=await browser.newPage()
  await broken.route('**/assets/ProjectScreenScene-*.js',route=>route.abort())
  await broken.goto(url);await broken.locator('.project-screens').scrollIntoViewIfNeeded()
  await broken.locator('.project-screens[data-screen-status="fallback"]').waitFor()
  assert(await broken.getByRole('link',{name:'Посмотреть сайт',exact:true}).isVisible())
  await broken.close()
  console.log('PASS added objects: chrome drag/orbit, real glass transmission, volumetric screens/tilt, weak mobile, one active renderer and local fallbacks')
}
