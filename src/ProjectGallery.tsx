import { useState } from 'react'
import { motion, useMotionValue, useSpring } from 'motion/react'
import useReducedMotion from './useReducedMotion'
import { ArrowUpRight } from 'lucide-react'
import { projects } from './projects'
import type { Project } from './projects'
import ProjectScreens from './ProjectScreens'

function ProjectPlane({ project, active }: { project: Project; active: boolean }) {
  const reduced = useReducedMotion()
  return <motion.article className={`project-plane ${active ? 'is-active' : ''}`} initial={false} animate={{ opacity: active ? 1 : 0, y: reduced ? 0 : active ? 0 : 12 }} transition={{ duration: reduced ? 0 : .4 }} inert={!active} aria-hidden={!active}>
    <div className="project-info"><div><span className="micro">{project.demo ? 'ДЕМОНСТРАЦИОННЫЙ ПРОЕКТ' : project.category}</span><h3>{project.name}</h3><p>{project.description}</p><small>{project.technologies.length ? project.technologies.join(' / ') : project.upcoming ? 'Технологии определяются под задачу' : project.category}</small></div>{!project.url && <span className="coming">Скоро</span>}</div>
  </motion.article>
}
export default function ProjectGallery({ paused = false }: { paused?: boolean }) {
  const [active, setActive] = useState(0)
  const reduced = !!useReducedMotion()
  const position = useMotionValue(0)
  const smooth = useSpring(position, { stiffness: 160, damping: 32, restDelta: .001 })
  const currentProject = projects[active]
  const select = (index: number) => { position.set(index); setActive(index) }
  return <div className="gallery-runway"><div className="gallery-layout">
    <div className="gallery-index">{projects.map((item, i) => <button key={item.name} className={active === i ? 'selected' : ''} onClick={() => select(i)} aria-pressed={active === i}><span>0{i + 1}</span>{item.name}<ArrowUpRight size={16}/></button>)}<p>Выберите проект.<br/>Рассмотрите его под новым углом.</p><div className="depth-ruler" aria-hidden="true"><span>NEAR</span><i/><span>FAR</span></div></div>
    <div className="gallery-perspective"><div className="project-deck"><ProjectScreens position={reduced ? position : smooth} active={active} reduced={reduced} paused={paused}/><div className="project-meta-deck">{projects.map((project, i) => <ProjectPlane key={project.name} project={project} active={active === i}/>)}</div></div><div className="gallery-controls"><span role="status" aria-live="polite">0{active + 1} <span>/ 0{projects.length}</span></span><div className="gallery-open-actions"><a className="gallery-project-visit" href={currentProject.url || '#contact'} rel="noopener noreferrer">{currentProject.upcoming ? 'Обсудить идею' : 'Посмотреть сайт'}<ArrowUpRight size={16}/></a><a className="round-link gallery-round-link" href={currentProject.url || '#contact'} rel="noopener noreferrer" aria-label={currentProject.upcoming ? 'Связаться по поводу нового проекта' : `Открыть сайт ${currentProject.name}`}><ArrowUpRight size={19}/></a></div><div className="gallery-page-controls"><button aria-label="Предыдущий проект" onClick={() => select((active + projects.length - 1) % projects.length)}>←</button><button aria-label="Следующий проект" onClick={() => select((active + 1) % projects.length)}>→</button></div></div></div>
  </div></div>
}
