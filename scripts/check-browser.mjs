import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { checkObjects } from './check-objects.mjs'

// Regression: production alone missed a StrictMode cleanup crash in npm run dev.
const servers = []
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
async function serve(preview, port) {
  const proc = spawn(process.execPath, ['node_modules/vite/bin/vite.js', ...(preview ? ['preview'] : []), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] })
  servers.push(proc)
  let output = ''
  proc.stdout.on('data', value => { output += value })
  proc.stderr.on('data', value => { output += value })
  const url = `http://127.0.0.1:${port}`
  for (let i = 0; i < 80; i++) {
    if (proc.exitCode !== null) throw new Error(output)
    try { if ((await fetch(url)).ok) return url } catch { /* server starting */ }
    await delay(100)
  }
  throw new Error(`Server did not start: ${output}`)
}
async function content(page, url) {
  if (url) await page.goto(url)
  await page.locator('h1').waitFor()
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 0) })
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.hero-type')).opacity) > .99)
  assert(await page.getByRole('heading', { level: 1 }).isVisible())
  await page.waitForFunction(() => Array.from(document.querySelectorAll('h1 .fluid-line')).every(e => e.dataset.typeReady === 'true'))
  assert(await page.locator('h1 .fluid-ink').evaluateAll(nodes => nodes.every(e => {
    const style=getComputedStyle(e)
    return style.filter === 'none' && style.transform === 'none' && style.clipPath === 'none'
  })), 'Settled heading has no residual blur, mask or transform')
  assert.equal(await page.getByRole('navigation', { includeHidden: true }).count(), 1)
  assert.equal(await page.locator('#projects').count(), 1)
  for (const name of ['Связаться со мной', '@yuniorqq', 't.me/yuniorqq']) assert.equal(await page.getByRole('link', { name, exact: true }).getAttribute('href'), 'https://t.me/yuniorqq')
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
}
async function healthy(page, url) {
  await content(page, url)
  await page.locator('[data-scene-status="ready"]').waitFor({ timeout: 15000 })
  // A healthy canvas must not intercept any HTML controls.
  assert.equal(await page.locator('.experience-art canvas').evaluate(e => getComputedStyle(e).pointerEvents), 'none')
}
async function fallback(page, url) {
  if (url) await page.goto(url)
  await page.locator('[data-scene-status="fallback"]').waitFor({ timeout: 15000 })
  await content(page)
  assert(await page.locator('.scene-fallback').isVisible())
  assert.equal(await page.locator('.experience-art canvas').count(), 0)
  assert.equal(await page.locator('.hero-copy').getAttribute('aria-hidden'), null)
  assert.equal(await page.locator('.hero-copy').evaluate(e => e.inert), false)
  assert.equal(await page.locator('.experience-pin').evaluate(e => getComputedStyle(e).position), 'relative')
  await page.getByRole('link', { name: 'Мои проекты', exact: true }).click()
  await page.getByRole('link', { name: 'Посмотреть сайт' }).click({ trial: true })
  await page.locator('#contact').scrollIntoViewIfNeeded()
  assert(await page.getByRole('link', { name: '@yuniorqq', exact: true }).isVisible())
  // Accent failures are local: contacts still work when the hero falls back.
}
async function projectNavigation(page, url, linkName, touch = false) {
  const destination = 'https://lambent-pudding-e679ea.netlify.app/'
  // Only stub the external response. This tests a REAL click/navigation, not
  // remote Netlify availability (outbound access may be denied in CI).
  const response = route => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Navigation test</title><p>NEXORA navigation reached</p>' })
  await page.context().route(destination, response)
  try {
    await healthy(page, url)
    await page.locator('.gallery-index').getByRole('button', { name: /NEXORA DIGITAL/ }).click()
    await page.waitForFunction(() => document.querySelector('.project-plane.is-active h3')?.textContent === 'NEXORA DIGITAL')
    await page.waitForTimeout(1000)
    const link = page.getByRole('link', { name: linkName, exact: true })
    assert.equal(await link.getAttribute('href'), destination)
    assert.equal(await link.getAttribute('target'), null)
    await Promise.all([page.waitForURL(destination), touch ? link.tap() : link.click()])
    assert.equal(page.url(), destination)
    assert(await page.getByText('NEXORA navigation reached').isVisible())
  } finally { await page.context().unroute(destination, response) }
}
let browser
try {
  const dev = await serve(false, 5175), preview = await serve(true, 4175)
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined, args: ['--enable-unsafe-swiftshader'] })
  // Intro has its own full-sequence suite. These checks exercise the entered site.
  const createPage=browser.newPage.bind(browser)
  browser.newPage=async options=>{const page=await createPage(options);await page.addInitScript(()=>sessionStorage.setItem('nikolay-portal-seen-v1','1'));return page}

  for (const url of [dev, preview]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, hasTouch: true })
    await page.addInitScript(()=>{
      window.__unexpectedPortal=0
      const original=WebGL2RenderingContext.prototype.shaderSource
      WebGL2RenderingContext.prototype.shaderSource=function(shader,source){if(source.includes('PORTAL_BLACK_HOLE'))window.__unexpectedPortal++;return original.call(this,shader,source)}
    })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await healthy(page, url)
    for (let i = 0; i < 3; i++) { await page.reload(); await healthy(page) }
    assert.equal(await page.locator('.opening').evaluate(e=>e.nextElementSibling.id),'projects')
    assert.equal(await page.locator('.experience-pin').evaluate(e=>getComputedStyle(e).position),'sticky','Hero retains its requested orbital scroll passage')
    assert(await page.locator('.experience-track').evaluate(e=>e.getBoundingClientRect().height>innerHeight*2),'Hero has a bounded scroll passage')
    for(const selector of ['#projects','#about','#capabilities','#contact','#about','#projects','.header']){
      await page.locator(selector).scrollIntoViewIfNeeded();await page.waitForTimeout(200)
      const sky=await page.locator('.ambient-background').boundingBox()
      assert(sky&&Math.abs(sky.y)<1&&Math.abs(sky.height-await page.evaluate(()=>innerHeight))<1,'Cosmic background remains fixed to the viewport throughout all sections')
      assert.equal(await page.locator('.cosmic-intro,.ton-caption,.horizon-shade,.passage-copy').count(),0,'No repeated dive or portal UI during scrolling')
    }
    assert.equal(await page.evaluate(()=>window.__unexpectedPortal),0,'Main site never compiles a black hole')
    await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(500)
    assert.equal(await page.locator('.hero-copy').evaluate(e=>e.inert),false)
    await projectNavigation(page, url, 'Открыть сайт NEXORA DIGITAL')
    await page.setViewportSize({ width: 390, height: 844 })
    await projectNavigation(page, url, 'Посмотреть сайт', true)
    await healthy(page, url)
    await page.getByRole('button', { name: 'Открыть меню' }).click()
    await page.getByRole('navigation').getByRole('link', { name: 'Контакты' }).click()
    await page.getByRole('link', { name: 'Связаться со мной', exact: true }).click({ trial: true })
    await page.locator('.accent-cube').scrollIntoViewIfNeeded()
    await page.locator('.accent-cube[data-accent-status="ready"]').waitFor({ timeout: 15000 })
    assert.equal(await page.locator('.accent-cube canvas').evaluate(e => getComputedStyle(e).pointerEvents), 'none')
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 })
      await page.waitForTimeout(350)
      const centered = await page.evaluate(() => {
        const cube = document.querySelector('.accent-cube').getBoundingClientRect()
        const address = document.querySelector('.telegram-address').getBoundingClientRect()
        return cube.bottom < address.top && Math.abs(cube.x + cube.width / 2 - innerWidth / 2) < 2
          && Math.abs(address.x + address.width / 2 - innerWidth / 2) < 2
      })
      assert(centered, `Cube and Telegram are centered and stacked at ${width}px`)
    }
    assert.deepEqual(errors, [], `${url}: unexpected runtime errors`)
    await page.close()
    console.log(`PASS ${url}: StrictMode/reload, scroll, mobile, menu and contacts`)
  }
  for (const failure of ['no-webgl', 'module', 'renderer', 'shader', 'context-lost', 'timeout']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    if (failure === 'module') await page.route('**/assets/Scene-*.js', route => route.abort())
    if (failure === 'timeout') await page.route('**/assets/Scene-*.js', () => { /* leave the module pending */ })
    if (failure === 'no-webgl' || failure === 'renderer') await page.addInitScript(mode => {
      const original = HTMLCanvasElement.prototype.getContext
      let attempts = 0
      HTMLCanvasElement.prototype.getContext = function(kind, ...args) {
        if (kind.startsWith('webgl') && (mode === 'no-webgl' || ++attempts > 1)) return null
        return original.call(this, kind, ...args)
      }
    }, failure)
    if (failure === 'shader') await page.addInitScript(() => {
      const original = WebGL2RenderingContext.prototype.shaderSource
      WebGL2RenderingContext.prototype.shaderSource = function(shader, source) {
        return original.call(this, shader, source.includes('HERO_ORBITAL_NEXUS') ? 'INVALID_SHADER' : source)
      }
    })
    if (failure === 'context-lost') {
      await healthy(page, preview)
      await page.evaluate(() => document.querySelector('.experience-art canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext())
      await fallback(page)
    } else await fallback(page, preview)
    await page.close()
    console.log(`PASS ${failure}: static sculpture + visible, usable HTML; no empty pinned scene`)
  }
  for (const failure of ['accent-module', 'accent-context']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    if (failure === 'accent-module') await page.route('**/assets/AccentScene-*.js', route => route.abort())
    await healthy(page, preview)
    await page.locator('.accent-cube').scrollIntoViewIfNeeded()
    if (failure === 'accent-context') {
      await page.locator('.accent-cube[data-accent-status="ready"]').waitFor()
      await page.evaluate(() => document.querySelector('.accent-cube canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext())
    }
    await page.locator('.accent-cube[data-accent-status="fallback"]').waitFor()
    assert(await page.locator('.accent-cube .accent-fallback').isVisible())
    for (const name of ['Связаться со мной', '@yuniorqq', 't.me/yuniorqq']) assert.equal(await page.getByRole('link', { name, exact: true }).getAttribute('href'), 'https://t.me/yuniorqq')
    assert.equal(await page.locator('#root h1').count(), 1)
    await page.getByRole('link', { name: 'Связаться со мной', exact: true }).click({ trial: true })
    await page.close()
    console.log(`PASS ${failure}: cube fallback, Telegram and the rest of the app survive`)
  }
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    await page.addInitScript(() => {
      window.__cubeStats = { counts: [], frames: 0, uploads: 0, lastBodyCount: 0, samples: [] }
      const proto = WebGL2RenderingContext.prototype
      for (const method of ['drawElementsInstanced', 'drawArraysInstanced']) {
        const original = proto[method]
        proto[method] = function(...args) {
          if (this.canvas.closest('.accent-cube')) {
            const count = args.at(-1), stats = window.__cubeStats
            stats.counts.push(count)
            if (count === 26 || count === 17) { stats.lastBodyCount = count; stats.frames++; stats.samples.push({count,uploads:stats.uploads}) }
          }
          return original.apply(this, args)
        }
      }
      const upload = proto.bufferSubData
      proto.bufferSubData = function(...args) {
        if (this.canvas.closest('.accent-cube') && args[2] instanceof Float32Array && [416,144,864,432].includes(args[2].length)) window.__cubeStats.uploads++
        return upload.apply(this, args)
      }
    })
    await healthy(page, preview)
    await page.locator('.accent-cube').scrollIntoViewIfNeeded()
    await page.locator('.accent-cube[data-accent-status="ready"]').waitFor()
    assert.equal(await page.locator('.accent-cube button').count(), 0, 'Cube has no controls')
    assert.equal(await page.locator('.accent-cube canvas').evaluate(c => c.getContext('webgl2').getContextAttributes().antialias), true)
    await page.waitForFunction(() => window.__cubeStats.lastBodyCount === 17, null, { timeout: 25000 })
    const startSample=await page.evaluate(()=>window.__cubeStats.samples.length)
    await page.waitForFunction(n=>window.__cubeStats.samples.length>=n+9,startSample)
    const samples=await page.evaluate(n=>window.__cubeStats.samples.slice(n),startSample)
    assert(samples.some((s,i)=>i>0&&s.count===17&&samples[i-1].count===17&&s.uploads===samples[i-1].uploads),'Moving-layer frames render without uploading instance matrices; actual turn boundaries may upload')
    await page.getByRole('button',{name:'Приостановить анимации',exact:true}).evaluate(e=>e.click())
    await page.waitForTimeout(100)
    const pausedUploads=await page.evaluate(()=>window.__cubeStats.uploads)
    await page.waitForTimeout(250)
    assert.equal(await page.evaluate(()=>window.__cubeStats.uploads),pausedUploads,'Pausing mid-turn preserves the pivot without resetting instance buffers')
    const pausedFrames=await page.evaluate(()=>window.__cubeStats.samples.length)
    await page.getByRole('button',{name:'Продолжить анимации',exact:true}).evaluate(e=>e.click())
    await page.waitForFunction(n=>window.__cubeStats.samples.length>n,pausedFrames)
    assert.equal(await page.evaluate(n=>window.__cubeStats.samples[n].uploads,pausedFrames),pausedUploads,'First resumed frame preserves buffers and the partial turn')
    await page.waitForFunction(() => window.__cubeStats.lastBodyCount === 26, null, { timeout: 15000 })
    const counts = await page.evaluate(() => window.__cubeStats.counts)
    for (const count of [26,54,17,9,33,21]) assert(counts.includes(count), `Expected GPU batch of ${count} instances`)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.waitForTimeout(400)
    const stopped = await page.evaluate(() => window.__cubeStats.frames)
    await page.waitForTimeout(1200)
    assert(await page.evaluate(before => window.__cubeStats.frames - before <= 1, stopped), 'Reduced motion stops continuous rendering; one pending resize redraw is allowed')
    await page.close()
    console.log('PASS cube GPU groups: 17+9 cubies, 54 white stickers, no per-frame matrix uploads, antialiasing and reduced motion')
  }
  await checkObjects(browser, preview)
  console.log('All browser regressions passed.')
} finally {
  await browser?.close()
  for (const server of servers) server.kill('SIGTERM')
}
