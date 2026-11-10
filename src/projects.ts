import rawCaptures from '../public/projects/screenshots.json'
export type Project = { name: string; description: string; category: string; technologies: string[]; url?: string; image?: string; upcoming?: boolean; demo?: boolean }
const captures=rawCaptures as {images:Record<string,{image:string;source:string;capturedAt:string}>}
const screenshot=(key:string,source:string)=>captures.images[key]?.source===source?captures.images[key].image:undefined
// Реальные снимки и их источники подключаются из public/projects/screenshots.json.
// Пока записи нет, 3D-панель показывает явно подписанную обложку, не скриншот.
// Стек AURA не подтверждён, поэтому не приписываем проекту технологии.
export const projects: Project[] = [
  { name: 'AURA BEAUTY', description: 'Демонстрационный сайт для салона красоты.', category: 'Красота / Демопроект', technologies: [], demo: true, url: 'https://amazing-pony-95fbe1.netlify.app/',image:screenshot('aura','https://amazing-pony-95fbe1.netlify.app/') },
  { name: 'NEXORA DIGITAL', description: 'Демонстрационный сайт NEXORA DIGITAL.', category: 'Digital / Демопроект', technologies: [], demo: true, url: 'https://lambent-pudding-e679ea.netlify.app/',image:screenshot('nexora','https://lambent-pudding-e679ea.netlify.app/') },
  { name: 'Следующая история', description: 'Место для нового проекта. Возможно, вашего.', category: 'Скоро в портфолио', technologies: [], upcoming: true },
]
