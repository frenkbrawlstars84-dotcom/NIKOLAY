import assert from 'node:assert/strict'

// Synthetic local test image only; never shipped as a portfolio screenshot.
export async function checkProjectLoading(browser,dev){
  const page=await browser.newPage({viewport:{width:1366,height:768}})
  const errors=[];page.on('pageerror',error=>errors.push(error.message))
  await page.addInitScript(()=>sessionStorage.setItem('nikolay:intro-seen','1'))
  await page.route('**/src/projects.ts',async route=>{
    const response=await route.fetch(),body=await response.text()
    const replacement=body.replace('image: screenshot("aura", "https://amazing-pony-95fbe1.netlify.app/")','image: "/__capture-fixture.svg"')
    assert(replacement.includes('image: "/__capture-fixture.svg"'))
    await route.fulfill({response,body:replacement})
  })
  let release
  const hold=new Promise(resolve=>{release=resolve})
  await page.route('**/__capture-fixture.svg',async route=>{
    await hold
    await route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="1600" height="1000" fill="#eee5d6"/><rect x="100" y="100" width="650" height="800" fill="#384a65"/><rect x="850" y="100" width="650" height="800" fill="#c8a271"/></svg>'})
  })
  await page.goto(dev)
  await page.locator('.project-screens').scrollIntoViewIfNeeded()
  await page.locator('.screen-static-fallback').waitFor()
  assert(await page.locator('.screen-static-fallback strong').isVisible())
  assert.equal(await page.locator('.screen-static-fallback img').evaluate(image=>getComputedStyle(image).opacity),'0','Pending image cannot cover the explicit fallback')
  release()
  await page.locator('.project-screens[data-screen-status="ready"]').waitFor()
  await page.locator('.screen-static-fallback').waitFor({state:'detached'})
  assert(await page.locator('.project-screens canvas').isVisible())
  assert.deepEqual(errors,[])
  await page.close()
  console.log('PASS local capture fixture: pending decode keeps cover; ready image hands off to WebGL without an empty panel')
}
