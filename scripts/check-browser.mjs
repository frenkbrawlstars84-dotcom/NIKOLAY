import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const servers = []
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const sessionKey = 'nikolay:intro-seen'

async function serve(preview, port) {
  const child = spawn(process.execPath, [
    'node_modules/vite/bin/vite.js', ...(preview ? ['preview'] : []),
    '--host', '127.0.0.1', '--port', String(port), '--strictPort'
  ], { stdio: ['ignore', 'pipe', 'pipe'] })
  servers.push(child)
  let output = ''
  child.stdout.on('data', chunk => { output += chunk })
  child.stderr.on('data', chunk => { output += chunk })
  const url = 'http://127.0.0.1:' + port
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error(output)
    try { if ((await fetch(url)).ok) return url } catch { /* starting */ }
    await delay(100)
  }
  throw new Error('Vite did not start: ' + output)
}

const uncaught = page => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  return errors
}

async function checkMain(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.locator('.cosmic-intro').waitFor({ state: 'detached', timeout: 7000 })
  await page.locator('h1').waitFor()
  assert(await page.getByRole('heading', { level: 1 }).isVisible(), 'Hero heading visible')
  for (const id of ['projects', 'about', 'capabilities', 'contact']) {
    assert.equal(await page.locator('#' + id).count(), 1, 'Section ' + id)
  }
  assert.equal(await page.locator('.experience-track,.experience-pin,.ton-caption').count(), 0,
    'No second scroll-driven cosmic journey')
  assert.equal(await page.locator('.site-root').evaluate(element => element.inert), false)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  assert.equal(await page.getByRole('link', { name: 'Связаться со мной', exact: true }).getAttribute('href'),
    'https://t.me/yuniorqq')

  const gallery = page.locator('.polished-project-screens')
  await gallery.scrollIntoViewIfNeeded()
  assert(await gallery.locator('.portfolio-preview').isVisible(), 'Project preview is immediate')
  assert.equal(await page.locator('.closing-marquee .marquee-track > span').count(), 2)
  assert(await page.locator('.scroll-progress').isVisible(), 'Scroll progress is present')
  assert.equal(await gallery.locator('canvas').count(), 0, 'Gallery has no second WebGL renderer')

  for (const [name, expected] of [
    ['AURA BEAUTY', 'https://amazing-pony-95fbe1.netlify.app/'],
    ['NEXORA DIGITAL', 'https://lambent-pudding-e679ea.netlify.app/']
  ]) {
    await page.locator('.gallery-index').getByRole('button', { name: new RegExp(name) }).click()
    assert(await gallery.locator('.portfolio-preview').isVisible())
    assert.equal(await page.getByRole('link', { name: 'Посмотреть сайт', exact: true }).getAttribute('href'), expected)
    assert(await gallery.locator('.preview-real-image,.preview-cover-note').count() > 0,
      'A labelled cover or a real screenshot always exists')
  }
  await page.locator('.gallery-index').getByRole('button', { name: /YOUR NEXT IDEA/ }).click()
  assert.equal(await page.getByRole('link', { name: 'Обсудить идею', exact: true }).getAttribute('href'), '#contact')
}

async function checkIntro(browser, url) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  const errors = uncaught(page)
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  assert(await page.locator('.cosmic-intro').isVisible(), 'Intro is the first screen')
  assert.equal(await page.locator('.intro-vortex path').count(), 96)
  assert.equal(await page.locator('.cosmic-intro canvas').count(), 0, 'Intro requires no WebGL')
  assert.equal(await page.locator('.site-root').evaluate(el => el.inert), true)
  await page.waitForTimeout(850)
  assert(await page.locator('.cosmic-intro').isVisible(), 'Intro must wait for the visitor')
  assert.equal(await page.locator('.intro-progress').getAttribute('aria-valuenow'), '0')

  if (url.includes('4175')) await page.screenshot({ path: 'test-artifacts/01-intro-initial.png' })
  await page.mouse.move(840, 650)
  await page.mouse.down()
  await page.mouse.move(840, 490, { steps: 9 })
  const partial = Number(await page.locator('.intro-progress').getAttribute('aria-valuenow'))
  assert(partial > 25 && partial < 80, 'Dragging changes vortex progression')
  if (url.includes('4175')) await page.screenshot({ path: 'test-artifacts/02-intro-dragging.png' })
  await page.mouse.move(840, 215, { steps: 12 })
  await page.mouse.up()
  await page.locator('.cosmic-intro').waitFor({ state: 'detached', timeout: 5000 })
  assert.equal(await page.evaluate(key => sessionStorage.getItem(key), sessionKey), '1')
  assert.equal(await page.evaluate(() => document.body.style.overflow), '', 'Scrolling is restored')
  if (url.includes('4175')) await page.screenshot({ path: 'test-artifacts/03-hero-desktop.png' })

  await page.reload()
  assert.equal(await page.locator('.cosmic-intro').count(), 0, 'Session reload skips intro')
  await page.goto(url + '/?previewIntro=1')
  await page.mouse.wheel(0, 900)
  await page.locator('.cosmic-intro').waitFor({ state: 'detached', timeout: 5000 })
  assert.equal(await page.evaluate(key => sessionStorage.getItem(key), sessionKey), '1',
    'Preview never changes session flag')

  await page.goto(url + '/?previewIntro=1')
  await page.getByRole('button', { name: /Войти в портфолио/ }).click()
  await page.locator('.cosmic-intro').waitFor({ state: 'detached', timeout: 5000 })
  await page.goto(url + '/?previewIntro=1')
  await page.getByRole('button', { name: /Пропустить/ }).click()
  assert.equal(await page.locator('.cosmic-intro').count(), 0, 'Skip removes overlay')
  await checkMain(page, url)
  if (url.includes('4175')) {
    await page.locator('#projects').scrollIntoViewIfNeeded()
    await page.screenshot({ path: 'test-artifacts/04-projects-desktop.png' })
    await page.locator('.closing-marquee').scrollIntoViewIfNeeded()
    await page.screenshot({ path: 'test-artifacts/05-closing-marquee.png' })
  }
  assert.deepEqual(errors, [])
  await page.close()
}

let browser
try {
  await mkdir('test-artifacts', { recursive: true })
  const dev = await serve(false, 5175)
  const preview = await serve(true, 4175)
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    args: ['--enable-unsafe-swiftshader']
  })
  for (const url of [dev, preview]) {
    await checkIntro(browser, url)
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    const errors = uncaught(page)
    await page.addInitScript(key => sessionStorage.setItem(key, '1'), sessionKey)
    await checkMain(page, url)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.reload()
    if (url.includes('4175')) await page.screenshot({ path: 'test-artifacts/06-hero-mobile.png' })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false,
      'No horizontal overflow on mobile')
    await page.getByRole('button', { name: 'Открыть меню' }).click()
    await page.getByRole('navigation').getByRole('link', { name: 'Контакты' }).click()
    assert(await page.locator('#contact').isVisible())
    assert.deepEqual(errors, [])
    await page.close()
    console.log('PASS portfolio showcase: ' + url)
  }
  const reduced = await browser.newPage({ reducedMotion: 'reduce' })
  await reduced.goto(preview + '/?previewIntro=1')
  assert.equal(await reduced.locator('.cosmic-intro').count(), 0)
  await reduced.close()
  console.log('PASS reduced motion and vector intro checks')
} finally {
  await browser?.close()
  for (const server of servers) server.kill('SIGTERM')
}
