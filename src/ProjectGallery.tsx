import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { ArrowUpRight, Plus } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { projects } from './projects'
import type { Project } from './projects'

function ProjectPlane({ project, index, active, position }: { project: Project; index: number; active: boolean; position: MotionValue<number> }) {
  const reduced = useReducedMotion()
  const tiltX = useSpring(0, { stiffness: 150, damping: 24 })
  const tiltY = useSpring(0, { stiffness: 150, damping: 24 })
  const imageX = useTransform(tiltY, [-8, 8], [-9, 9])
  const imageY = useTransform(tiltX, [-8, 8], [8, -8])
  const transform = useTransform(position, value => {
    const offset = index - value
    if (reduced) return 'none'
    return `translate3d(${offset * 72}px, ${Math.abs(offset) * 20}px, ${-Math.abs(offset) * 185}px) rotateY(${offset * -11}deg) rotateX(${Math.abs(offset) * 3}deg)`
  })
  const opacity = useTransform(position, value => reduced ? (active ? 1 : 0) : Math.max(0, 1 - Math.max(0, Math.abs(index - value) - .55) * 1.4))
  return <motion.article className={`project-plane ${active ? 'is-active' : ''}`} style={{ transform, opacity, zIndex: active ? 3 : 1 }} inert={!active} aria-hidden={!active}>
    <motion.div className="project-surface" style={{ rotateX: tiltX, rotateY: tiltY }}
      onPointerMove={e => {
        if (reduced || e.pointerType === 'touch') return
        const rect = e.currentTarget.getBoundingClientRect()
        tiltX.set(-(e.clientY - rect.top - rect.height / 2) / rect.height * 9)
        tiltY.set((e.clientX - rect.left - rect.width / 2) / rect.width * 9)
      }} onPointerLeave={() => { tiltX.set(0); tiltY.set(0) }}>
      <div className="project-frame-bar"><span><i/><i/><i/></span><span>{project.upcoming ? 'NEXT CHAPTER' : project.demo ? 'DEMONSTRATION WEBSITE' : 'PUBLISHED WEBSITE'}</span><span>0{index + 1}</span></div>
      <div className="project-image"><motion.div className="project-parallax" style={{ x: imageX, y: imageY }}>
        {project.image ? <img src={project.image} alt={`Скриншот ${project.name}`} loading="lazy" /> : project.upcoming ? <div className="future-art"><Plus size={52} strokeWidth={.7}/><strong>{project.name === 'NEXORA DIGITAL' ? 'NEXORA' : 'YOUR NEXT IDEA'}</strong><span>ПРОЕКТ ЕЩЁ НЕ ОПУБЛИКОВАН</span></div> : project.name === 'AURA BEAUTY' ? <div className="aura-preview"><div className="aura-top">AURA <span>BEAUTY STUDIO</span></div><small>ПРОСТРАНСТВО ВАШЕЙ КРАСОТЫ</small><strong>Искусство<br/><em>быть собой.</em></strong><div className="aura-lines">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ transform: `rotate(${i * 9}deg)` }}/>)}</div><span className="preview-label">КОНЦЕПТУАЛЬНОЕ ПРЕВЬЮ · НЕ СКРИНШОТ</span></div> : <div className="future-art published-art"><ArrowUpRight size={44} strokeWidth={.8}/><strong>{project.name === 'NEXORA DIGITAL' ? 'NEXORA' : project.name}</strong><span>ОБЛОЖКА ПРОЕКТА · НЕ СКРИНШОТ</span></div>}
      </motion.div></div>
      <div className="project-info"><div><span className="micro">{project.category}</span><h3>{project.name}</h3><p>{project.description}</p><small>{project.technologies.length ? project.technologies.join(' / ') : project.upcoming ? 'Технологии определяются под задачу' : 'Стек проекта не подтверждён'}</small></div>{!project.url && <span className="coming">Скоро</span>}</div>
    </motion.div>
  </motion.article>
}
export default function ProjectGallery() {
  const [active, setActive] = useState(0)
  const reduced = !!useReducedMotion()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<ScrollTrigger | null>(null)
  const position = useMotionValue(0)
  const smooth = useSpring(position, { stiffness: 160, damping: 32, restDelta: .001 })
  useEffect(() => {
    const media = gsap.matchMedia()
    if (!reduced) media.add('(min-height: 651px)', () => {
      trigger.current = ScrollTrigger.create({
        trigger: root.current, start: 'top 90px', end: 'bottom bottom-=50',
        onUpdate: self => {
          const value = self.progress * (projects.length - 1)
          position.set(value)
          setActive(Math.round(value))
        },
      })
      return () => { trigger.current?.kill(); trigger.current = null }
    })
    return () => media.revert()
  }, [position, reduced])
  const currentProject = projects[active]
  const select = (index: number) => {
    const scene = trigger.current
    if (scene && scene.end > scene.start) {
      const nextY = scene.start + (scene.end - scene.start) * index / Math.max(projects.length - 1, 1)
      window.scrollTo({ top: nextY, behavior: 'smooth' })
    } else { position.set(index); setActive(index) }
  }
  return <div ref={root} className="gallery-runway"><div className="gallery-layout">
    <div className="gallery-index">{projects.map((item, i) => <button key={item.name} className={active === i ? 'selected' : ''} onClick={() => select(i)} aria-pressed={active === i}><span>0{i + 1}</span>{item.name}<ArrowUpRight size={16}/></button>)}<p>Листайте, чтобы пройти галерею.<br/>Или выберите проект напрямую.</p><div className="depth-ruler" aria-hidden="true"><span>NEAR</span><i/><span>FAR</span></div></div>
    <div className="gallery-perspective"><div className="gallery-floor" aria-hidden="true"/><div className="project-deck">{projects.map((project, i) => <ProjectPlane key={project.name} project={project} index={i} active={active === i} position={reduced ? position : smooth}/>)}</div><div className="gallery-controls"><span role="status" aria-live="polite">0{active + 1} <span>/ 0{projects.length}</span></span>{currentProject.url && <div className="gallery-open-actions"><a className="gallery-project-visit" href={currentProject.url} rel="noopener noreferrer">{currentProject.demo ? 'Смотреть демосайт' : 'Смотреть сайт'}<ArrowUpRight size={16}/></a><a className="round-link gallery-round-link" href={currentProject.url} rel="noopener noreferrer" aria-label={`Открыть сайт ${currentProject.name}`}><ArrowUpRight size={19}/></a></div>}<div className="gallery-page-controls"><button aria-label="Предыдущий проект" onClick={() => select((active + projects.length - 1) % projects.length)}>←</button><button aria-label="Следующий проект" onClick={() => select((active + 1) % projects.length)}>→</button></div></div></div>
  </div></div>
}
