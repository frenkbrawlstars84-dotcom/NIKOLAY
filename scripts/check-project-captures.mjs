import {readFile} from 'node:fs/promises'
const folder=new URL('../public/projects/',import.meta.url),manifest=JSON.parse(await readFile(new URL('screenshots.json',folder),'utf8'))
let missing=false
for(const key of ['aura','nexora']){
  const entry=manifest.images[key]
  try{
    if(!entry?.image||!entry.source||!entry.capturedAt)throw new Error('Capture metadata missing')
    const bytes=await readFile(new URL(entry.image.replace('/projects/',''),folder))
    if(bytes.readUInt32BE(0)!==0x89504e47)throw new Error('Not a real PNG capture')
    console.log(`PASS ${key}: ${entry.image}, source ${entry.source}`)
  }catch{
    console.error(`MISSING ${key}: a real website screenshot is required`);missing=true
  }
}
if(missing)process.exitCode=1
