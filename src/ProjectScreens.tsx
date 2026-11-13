import type { MotionValue } from 'motion/react'
import { projects } from './projects'

/**
 * Always-visible project preview. A real project screenshot takes priority when
 * available; otherwise a clearly labelled editorial cover is displayed.
 * No second WebGL canvas, texture upload or delayed image decoding.
 */
export default function ProjectScreens({ active }: {
  position: MotionValue<number>; active: number; reduced: boolean; paused: boolean
}) {
  const project = projects[active]
  const aura = project.name === 'AURA BEAUTY'
  const nexora = project.name === 'NEXORA DIGITAL'
  return <div className="project-screens polished-project-screens" aria-label={'Превью проекта ' + project.name}>
    <div className={'portfolio-preview ' + (aura ? 'preview-aura' : nexora ? 'preview-nexora' : 'preview-next')} key={project.name}>
      <div className="preview-browser">
        <span className="preview-browser-dots" aria-hidden="true"><i/><i/><i/></span>
        <span>{project.url ? new URL(project.url).hostname : 'nikolay / your next idea'}</span>
        <span className="preview-browser-mark">N / 0{active + 1}</span>
      </div>
      {project.image ? <img className="preview-real-image" src={project.image} alt={'Скриншот ' + project.name} loading="eager" decoding="async" /> :
      aura ? <div className="preview-aura-content">
        <div className="preview-topline"><strong>AURA BEAUTY</strong><span>BEAUTY STUDIO</span></div>
        <div className="preview-aura-hero">
          <div><small>ВАША КРАСОТА — НАШЕ ВДОХНОВЕНИЕ</small><h3>Искусство<br/><em>быть собой.</em></h3><p>Салон красоты · Демонстрационный проект</p><span className="preview-aura-pill">ЗНАКОМСТВО С ПРОЕКТОМ <b>↗</b></span></div>
          <div className="preview-aura-art" aria-hidden="true"><i/><i/><i/><i/></div>
        </div>
        <div className="preview-aura-bottom"><span>УХОД</span><span>ЭСТЕТИКА</span><span>ВДОХНОВЕНИЕ</span></div>
      </div> :
      nexora ? <div className="preview-nexora-content">
        <div className="preview-nexora-glow" aria-hidden="true"/>
        <div className="preview-topline"><strong>NEXORA<span>®</span></strong><span>DIGITAL CREATIVE STUDIO</span></div>
        <div className="preview-nexora-hero"><small>DESIGN / DEVELOPMENT / EXPERIENCE</small><h3>Digital ideas.<br/><em>Real impact.</em></h3><p>Демонстрационный лендинг для digital-агентства</p><span className="preview-nexora-pill">EXPLORE PROJECT <b>↗</b></span></div>
        <div className="preview-nexora-bottom"><span>01 / CREATIVE</span><span>02 / BUILD</span><span>03 / LAUNCH</span></div>
      </div> :
      <div className="preview-next-content">
        <span>THE NEXT CHAPTER</span><h3>YOUR<br/><em>NEXT IDEA.</em></h3><p>Возможно, следующий проект будет твоим.</p>
        <div className="preview-next-orbit" aria-hidden="true"><i/><i/><i/></div>
      </div>}
      {!project.image && <div className="preview-cover-note">ДИЗАЙН-ОБЛОЖКА · НЕ СКРИНШОТ</div>}
    </div>
  </div>
}
