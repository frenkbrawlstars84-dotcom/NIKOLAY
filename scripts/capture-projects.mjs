import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { mkdir,readFile,writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const root=fileURLToPath(new URL('../',import.meta.url)),folder=new URL('../public/projects/',import.meta.url)
const sources=[['aura','https://amazing-pony-95fbe1.netlify.app/','AURA'],['nexora','https://lambent-pudding-e679ea.netlify.app/','NEXORA']]
// Preflight through the environment's supplied proxy. Fail on policy denial,
// HTTP errors or offline pages, rather than saving an error page as a screenshot.
for(const [,url] of sources)execFileSync('curl',['--fail','--silent','--show-error','--location','--max-time','25',url],{cwd:root,stdio:['ignore','ignore','pipe']})
const proxyAddress=process.env.HTTPS_PROXY||process.env.https_proxy
const proxy=proxyAddress?new URL(proxyAddress):null
const browser=await chromium.launch({
  executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,
  ...(proxy?{proxy:{server:`${proxy.protocol}//${proxy.host}`,...(proxy.username?{username:decodeURIComponent(proxy.username),password:decodeURIComponent(proxy.password)}:{})}}:{}),
})
await mkdir(folder,{recursive:true})
const manifestPath=new URL('screenshots.json',folder)
const manifest=JSON.parse(await readFile(manifestPath,'utf8'))
try{
  const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1})
  for(const [key,url,brand] of sources){
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000})
    if(!response?.ok())throw new Error(`${key}: HTTP ${response?.status()}`)
    await page.getByText(new RegExp(brand,'i')).first().waitFor({timeout:20000})
    await page.evaluate(()=>document.fonts.ready)
    await page.waitForTimeout(2500)
    await page.waitForFunction(()=>Array.from(document.images).filter(img=>{const r=img.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight&&r.width>20&&r.height>20}).every(img=>img.complete),null,{timeout:15000})
    const broken=await page.evaluate(()=>Array.from(document.images).filter(img=>{const r=img.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight&&r.width>20&&r.height>20&&!img.naturalWidth}).map(img=>new URL(img.currentSrc||img.src).hostname))
    if(broken.length)throw new Error(`${key}: visible images did not load from ${[...new Set(broken)].join(', ')}`)
    const original=await page.screenshot({fullPage:false,type:'png'})
    const encoded=await page.evaluate(async source=>{
      const image=new Image();image.src=source;await image.decode()
      const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight
      canvas.getContext('2d').drawImage(image,0,0)
      return canvas.toDataURL('image/webp',.9).split(',')[1]
    },`data:image/png;base64,${original.toString('base64')}`)
    const optimized=Buffer.from(encoded,'base64')
    if(optimized.toString('ascii',8,12)!=='WEBP')throw new Error('Browser did not encode WebP')
    await writeFile(new URL(`${key}.webp`,folder),optimized)
    manifest.images[key]={image:`/projects/${key}.webp`,source:url,capturedAt:new Date().toISOString(),viewport:{width:1600,height:1000},format:'webp',bytes:optimized.length,captureSha256:createHash('sha256').update(original).digest('hex')}
    await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n')
    console.log(`Captured real ${brand} screenshot: public/projects/${key}.webp (${optimized.length} bytes)`)
  }
}finally{await browser.close()}
