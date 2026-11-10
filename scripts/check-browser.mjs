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
  assert.equal(await page.getByRole('link', { name: 'Связаться со мной', exact: true }).getAttribute('href'), 'https://t.me/yuniorqq')
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
    // Verify that the original cinematic transition still runs.
    await page.evaluate(() => {
      const rect = document.querySelector('.experience-track').getBoundingClientRect()
      window.scrollTo(0, scrollY + rect.top + (rect.height - innerHeight) * .6)
    })
    await page.waitForFunction(() => document.querySelector('.hero-copy').inert)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForFunction(() => !document.querySelector('.hero-copy').inert)
    await projectNavigation(page, url, 'Открыть сайт NEXORA DIGITAL')
    await page.setViewportSize({ width: 390, height: 844 })
    await projectNavigation(page, url, 'Смотреть сайт', true)
    await healthy(page, url)
    await page.getByRole('button', { name: 'Открыть меню' }).click()
    await page.getByRole('navigation').getByRole('link', { name: 'Контакты' }).click()
    await page.getByRole('link', { name: 'Связаться со мной', exact: true }).click({ trial: true })
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
  console.log('All browser regressions passed.')
} finally {
  await browser?.close()
  for (const server of servers) server.kill('SIGTERM')
}
