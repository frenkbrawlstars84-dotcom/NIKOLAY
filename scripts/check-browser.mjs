import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

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
  await page.getByRole('link', { name: 'Смотреть демосайт' }).click({ trial: true })
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
  for (const url of [dev, preview]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, hasTouch: true })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await healthy(page, url)
    for (let i = 0; i < 3; i++) { await page.reload(); await healthy(page) }
    // Slow, fast and reversed native scrolling through TON 618.
    const phase = async value => page.evaluate(v => {
      const rect = document.querySelector('.experience-track').getBoundingClientRect()
      window.scrollTo(0, scrollY + rect.top + (rect.height - innerHeight) * v)
    }, value)
    for (const value of [.32, .53, .68, .8, .92]) { await phase(value); await page.waitForTimeout(550) }
    assert.equal(await page.locator('.scene-layer').getAttribute('data-scene-status'), 'ready')
    assert.equal(await page.locator('.opening').evaluate(e => e.nextElementSibling.id), 'projects')
    assert.equal(await page.locator('#about').count(), 1)
    for (const value of [.1, .8, .2, .95, 1, 0]) { await phase(value); await page.waitForTimeout(30) }
    await page.waitForFunction(() => !document.querySelector('.hero-copy').inert)
    await page.waitForTimeout(800)
    assert.equal(await page.locator('.horizon-shade').evaluate(e => Number(getComputedStyle(e).opacity)), 0)
    await projectNavigation(page, url, 'Открыть сайт NEXORA DIGITAL')
    await page.setViewportSize({ width: 390, height: 844 })
    await projectNavigation(page, url, 'Смотреть сайт', true)
    await healthy(page, url)
    await page.getByRole('button', { name: 'Открыть меню' }).click()
    await page.getByRole('navigation').getByRole('link', { name: 'Контакты' }).click()
    await page.getByRole('link', { name: 'Связаться со мной', exact: true }).click({ trial: true })
    await page.locator('.accent-cube').scrollIntoViewIfNeeded()
    await page.locator('.accent-cube[data-accent-status="ready"]').waitFor({ timeout: 15000 })
    assert.equal(await page.locator('.accent-cube canvas').evaluate(e => getComputedStyle(e).pointerEvents), 'none')
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
        return original.call(this, shader, source.includes('uProgress') ? 'INVALID_SHADER' : source)
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
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
    await page.addInitScript(() => {
      window.__cubeBuffers = { body: null, colors: null }
      const proto = WebGL2RenderingContext.prototype
      for (const method of ['bufferData', 'bufferSubData']) {
        const original = proto[method]
        proto[method] = function(...args) {
          const data = args[method === 'bufferData' ? 1 : 2]
          if (this.canvas.closest('.accent-cube') && data instanceof Float32Array) {
            if (data.length === 416) window.__cubeBuffers.body = Array.from(data)
            if (data.length === 162) window.__cubeBuffers.colors = Array.from(data)
          }
          return original.apply(this, args)
        }
      }
    })
    await healthy(page, preview)
    await page.locator('.accent-cube').scrollIntoViewIfNeeded()
    await page.locator('.accent-cube[data-accent-status="ready"]').waitFor()
    await page.waitForFunction(() => window.__cubeBuffers.body && window.__cubeBuffers.colors)
    const initial = await page.evaluate(() => window.__cubeBuffers.body)
    let previous = initial
    for (let turn = 0; turn < 4; turn++) {
      await page.getByRole('button', { name: 'Повернуть грань', exact: true }).click()
      await page.waitForTimeout(150)
      const matrices = await page.evaluate(() => window.__cubeBuffers.body)
      let changed = 0
      const centers = []
      for (let cell = 0; cell < 26; cell++) {
        if (matrices.slice(cell * 16, cell * 16 + 16).some((v, i) => Math.abs(v - previous[cell * 16 + i]) > 1e-5)) changed++
        const position = matrices.slice(cell * 16 + 12, cell * 16 + 15)
        assert(position.every(v => Math.abs(v - Math.round(v)) < 1e-5))
        centers.push(position.map(Math.round).join(','))
      }
      assert.equal(changed, 9, 'A face turn updates exactly nine rendered cubies')
      assert.equal(new Set(centers).size, 26)
      previous = matrices
    }
    assert(previous.every((value, i) => Math.abs(value - initial[i]) < 1e-5), 'Four rendered quarter turns restore the original cube')
    const colors = await page.evaluate(() => window.__cubeBuffers.colors)
    for (let i = 0; i < colors.length; i += 3) assert(Math.abs(colors[i] - colors[i + 1]) < 1e-5 && Math.abs(colors[i] - colors[i + 2]) < 1e-5, 'Sticker colors are monochrome')
    await page.close()
    console.log('PASS cube GPU matrices: 26 centers, 9 cubies/turn, four exact quarter turns restore the cube, monochrome stickers')
  }
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    await page.addInitScript(() => {
      const original = WebGL2RenderingContext.prototype.shaderSource
      WebGL2RenderingContext.prototype.shaderSource = function(shader, source) { return original.call(this, shader, source.includes('float ribbons') ? 'INVALID_SHADER' : source) }
    })
    await healthy(page, preview)
    await page.evaluate(() => { const r = document.querySelector('.experience-track').getBoundingClientRect(); window.scrollTo(0, scrollY + r.top + (r.height - innerHeight) * .66) })
    await fallback(page)
    assert.equal(await page.locator('.horizon-shade').evaluate(e => getComputedStyle(e).display), 'none')
    await page.close()
    console.log('PASS deferred TON shader failure: cinematic shade disabled, visible HTML and contacts survive')
  }
  console.log('All browser regressions passed.')
} finally {
  await browser?.close()
  for (const server of servers) server.kill('SIGTERM')
}
