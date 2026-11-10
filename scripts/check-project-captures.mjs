import {readFile} from 'node:fs/promises'
const folder=new URL('../public/projects/',import.meta.url),manifest=JSON.parse(await readFile(new URL('screenshots.json',folder),'utf8'))
let missing=false
for(const key of ['aura','nexora']){
  const entry=manifest.images[key]
  try{
    if(!entry?.image||!entry.source||!entry.capturedAt)throw new Error('Capture metadata missing')
    const bytes=await readFile(new URL(entry.image.replace('/projects/',''),folder))
    const png=bytes.length>8&&bytes.readUInt32BE(0)===0x89504e47
    const webp=bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'
    if(!png&&!webp)throw new Error('Not a PNG/WebP capture')
    console.log(`PASS ${key}: ${entry.image}, source ${entry.source}`)
  }catch{
    console.error(`MISSING ${key}: a real website screenshot is required`);missing=true
  }
}
if(missing)process.exitCode=1
