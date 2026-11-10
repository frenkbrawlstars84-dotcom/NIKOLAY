export type Project = { name: string; description: string; category: string; technologies: string[]; url?: string; image?: string; upcoming?: boolean; demo?: boolean }
// Добавьте настоящий скриншот в public/projects и укажите image: '/projects/aura.webp'.
// Стек AURA не подтверждён, поэтому не приписываем проекту технологии.
export const projects: Project[] = [
  { name: 'AURA BEAUTY', description: 'Демонстрационный сайт для салона красоты.', category: 'Красота / Веб-сайт', technologies: [], demo: true, url: 'https://amazing-pony-95fbe1.netlify.app/' },
  { name: 'NEXORA DIGITAL', description: 'Веб-сайт NEXORA DIGITAL.', category: 'Веб-сайт / Опубликован', technologies: [], url: 'https://lambent-pudding-e679ea.netlify.app/' },
  { name: 'Следующая история', description: 'Место для нового проекта. Возможно, вашего.', category: 'Скоро в портфолио', technologies: [], upcoming: true },
]
