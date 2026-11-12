import React, { useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { motion, MotionConfig } from 'motion/react'
import useReducedMotion from './useReducedMotion'
import { ArrowUpRight, ArrowDown, Menu, X, Pause, Play, Plus, Send, MousePointer2, MoveUpRight, Check } from 'lucide-react'
import './style.css'
import './cinematic.css'
import './cosmic.css'
import './objects.css'
import AmbientBackground from './AmbientBackground'
import { contacts } from './config'
import FluidText from './FluidText'
import ProjectGallery from './ProjectGallery'
import useCinematicFlow from './useCinematicFlow'
import SceneLayer from './SceneLayer'
import AccentObject from './AccentObject'
import type { SceneStatus } from './SceneLayer'
const capabilities=['Современные лендинги','Сайты для бизнеса','Адаптивные интерфейсы','Интерактивные анимации','Функции и интеграции']
const demoDescriptions=['Нажмите: идея превращается в действие.','Проведите курсором: интерфейс следует за вами.','Смените формат: композиция подстраивается.','Запустите движение: форма меняет состояние.','Подключите модуль: возможности расширяются.']
const about='Привет, я Николай. Занимаюсь разработкой современных сайтов для бизнеса. Мне нравится превращать идеи в удобные, привлекательные и технологичные цифровые проекты.'
function App(){
 const reduced=!!useReducedMotion(); const root=useRef<HTMLDivElement>(null);const progress=useRef(0);const [paused,setPaused]=useState(false);const [menu,setMenu]=useState(false);const anchor=useRef<HTMLDivElement>(null);const [demo,setDemo]=useState([false,false,false,false,false]);
 const [sceneStatus,setSceneStatus]=useState<SceneStatus>('loading')
 const toggle=(i:number)=>setDemo(v=>v.map((x,n)=>n===i?!x:x))
 useCinematicFlow(root,anchor,progress,reduced,sceneStatus==='ready')
 const telegram=contacts.telegramUrl
 return <MotionConfig reducedMotion="user"><div ref={root} className={`site-root visual-status-${sceneStatus}`}><AmbientBackground reduced={reduced} paused={paused}/><a className="skip" href="#main">К содержимому</a><header className="header"><a className="brand" href="#">NIKOLAY<span>✳</span><small>DIGITAL EXPERIENCE</small></a><nav aria-label="Навигация" className={menu?'nav open':'nav'}>{[['Работы','#projects'],['Подход','#about'],['Возможности','#capabilities'],['Контакты','#contact']].map(([name,href])=><a key={href} href={href} onClick={()=>setMenu(false)}>{name}</a>)}</nav><a className="header-contact" href="#contact">Обсудим идею <ArrowUpRight size={15}/></a><button className="menu" aria-expanded={menu} aria-label={menu?'Закрыть меню':'Открыть меню'} onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button></header>
 <main id="main"><div className="opening"><div className="experience-track"><div className="experience-pin">
 <div className="experience-art"><SceneLayer progress={progress} reduced={reduced} paused={paused} anchor={anchor} onStatus={setSceneStatus}/></div>
 <section className="hero shell">
   <div className="hero-meta"><span><i/> НЕЗАВИСИМЫЙ ВЕБ-РАЗРАБОТЧИК</span><span>DESIGN × CODE × EXPERIENCE</span></div>
   <div className="hero-composition">
     <div className="hero-copy">
       <div className="hero-type">
         <span className="hero-greeting">Привет, я Николай</span>
         <h1><FluidText>За пределами</FluidText><br/><em><FluidText>обычного.</FluidText></em></h1>
       </div>
       <motion.div className="hero-bottom" initial={{opacity:0,y:reduced?0:15}} animate={{opacity:1,y:0}} transition={{duration:.7,delay:.35}}>
         <p>Создаю цифровые впечатления<br/>для вашего бизнеса<span>Веб-сайты, в которых встречаются<br/>эстетика, технологии и смысл.</span></p>
         <div className="hero-actions"><a className="button light" href="#projects">Мои проекты <ArrowUpRight size={17}/></a><a className="text-link" href="#contact">Обсудить проект <ArrowUpRight size={16}/></a></div>
       </motion.div>
     </div>
     <div className="hero-visual" ref={anchor}>
       <button className="portal-interaction" type="button" aria-label="Раскрыть металлический портал"><span>НАЖМИТЕ, ЧТОБЫ ИЗМЕНИТЬ ФОРМУ</span></button>
       <div className="visual-coordinate" aria-hidden="true"><span>01 / PROCEDURAL FORM</span><span>REALTIME · INTERACTIVE</span></div>
     </div>
   </div>
   <div className="hero-foot"><a href="#about"><ArrowDown size={15}/> ПРОКРУТИТЕ, ЧТОБЫ ИССЛЕДОВАТЬ</a><button onClick={()=>setPaused(!paused)} aria-label={paused?'Продолжить анимации':'Приостановить анимации'} aria-pressed={paused}>{paused?<Play size={13}/>:<Pause size={13}/>} {paused?'PLAY':'PAUSE'} / MOTION</button></div>
 </section>
 <div className="ton-caption" aria-hidden="true"><strong>TON 618</strong><span>ЗА ПРЕДЕЛАМИ ВИДИМОГО</span></div><div className="horizon-shade" aria-hidden="true"/><div className="passage-guides" aria-hidden="true"><span>SCENE 01 → SCENE 02</span><span>SCROLL TO TRAVEL</span><div className="passage-meter"><i/></div></div>
 <div className="passage-copy"><span>ФОРМА МЕНЯЕТСЯ. СМЫСЛ ОСТАЁТСЯ.</span><p>Из темноты —<br/><em>к новым идеям.</em></p></div>
 </div></div>
 </div>
 <section id="projects" className="work shell"><div className="section-label"><span>01 — ИЗБРАННЫЕ РАБОТЫ</span><span>ЦИФРОВЫЕ ИСТОРИИ</span></div><div className="section-heading"><h2><FluidText>От замысла</FluidText><br/><em><FluidText>к впечатлению.</FluidText></em></h2><p>Исследуйте проекты.<br/>У каждого — свой характер.</p></div><ProjectGallery paused={paused}/></section>
 <section id="about" className="about shell"><div className="section-label"><span>02 — ФИЛОСОФИЯ</span><span>ЧЕЛОВЕК ЗА КОДОМ</span></div><div className="about-body"><div className="about-sign"><span>Идея.<br/>Взаимодействие.<br/>Впечатление.</span><AccentObject kind="signal" reduced={reduced} paused={paused}/></div><h2 className="about-statement">{about.split(' ').map((word,i)=><span className="about-word" key={i}>{word} </span>)}</h2></div><div className="about-bottom"><span>Меньше лишнего. Больше смысла.</span><ArrowUpRight size={28}/></div></section>
 <section id="capabilities" className="capabilities shell"><div className="section-label"><span>03 — ЛАБОРАТОРИЯ ВОЗМОЖНОСТЕЙ</span><span>ПОПРОБУЙТЕ САМИ</span></div><div className="capabilities-intro"><div className="section-heading"><h2><FluidText>Не просто смотреть.</FluidText><br/><em><FluidText>Взаимодействовать.</FluidText></em></h2><p>Маленькие эксперименты.<br/>Большие возможности для вашего сайта.</p></div><AccentObject kind="glass" reduced={reduced} paused={paused}/></div><div className="lab-grid">{capabilities.map((name,i)=><article className={`lab lab-${i} ${demo[i]?'is-on':''}`} key={name}><div className="lab-demo">{i===0?<motion.button className="magnetic" whileHover={reduced?{}:{scale:1.08}} whileTap={reduced?{}:{scale:.9}} onClick={()=>toggle(i)}>{demo[i]?'Идея в движении':'Нажмите'}<ArrowUpRight size={17}/></motion.button>:i===1?<button className="tilt-demo" onClick={()=>toggle(i)} onPointerMove={e=>{if(reduced)return;const r=e.currentTarget.getBoundingClientRect();e.currentTarget.style.transform=`perspective(400px) rotateY(${(e.clientX-r.left-r.width/2)/6}deg) rotateX(${-(e.clientY-r.top-r.height/2)/6}deg)`}} onPointerLeave={e=>{e.currentTarget.style.transform=''}} aria-label="Взаимодействовать с карточкой"><span>YOUR BUSINESS</span><MoveUpRight/><i/>{demo[i]?'В центре внимания':'Новый угол зрения'}</button>:i===2?<button className="responsive-demo" onClick={()=>toggle(i)} aria-label="Сменить размер интерфейса"><div><i/><i/><i/><span/></div><small>{demo[i]?'МОБИЛЬНЫЙ':'ДЕСКТОП'} ↔</small></button>:i===3?<button className="morph-demo" onClick={()=>toggle(i)} aria-label="Изменить форму анимации"><div>{Array.from({length:12},(_,n)=><i key={n} style={{'--n':n} as React.CSSProperties}/>)}</div><small>{demo[i]?'ФОРМА':'ДВИЖЕНИЕ'} ↗</small></button>:<button className="integration-demo" onClick={()=>toggle(i)} aria-label="Переключить подключение модуля"><span>САЙТ</span><i/><span>{demo[i]?<Check size={18}/>:<Plus size={18}/>}</span><small>{demo[i]?'МОДУЛЬ ПОДКЛЮЧЁН':'ДОБАВИТЬ МОДУЛЬ'}</small></button>}</div><div className="lab-info"><span>0{i+1}</span><h3>{name}</h3><p>{demoDescriptions[i]}</p></div></article>)}</div><p className="lab-note"><MousePointer2 size={13}/> Интерактивные эксперименты — примеры возможностей, а не готовые коммерческие интеграции.</p></section>
 <section id="contact" className={`contact ${paused?'motion-paused':''}`}><div className="shell">
   <div className="section-label"><span>04 — СЛЕДУЮЩАЯ ГЛАВА</span><span>НАЧИНАЕТСЯ С РАЗГОВОРА</span></div>
   <div className="contact-orbit" aria-hidden="true"><span/><span/><span/></div>
   <h2 className="contact-title"><FluidText>Давайте создадим</FluidText><br/>что-то <em><FluidText>необычное.</FluidText></em><ArrowUpRight strokeWidth={.6}/></h2>
   <div className="contact-bottom"><p>Расскажите о своей идее, а я помогу<br/>воплотить её в современный сайт.</p>
     <div className="contact-cube-layout"><AccentObject kind="cube" reduced={reduced} paused={paused}/><div className="contact-links"><div className="telegram-address"><a className="telegram-username" href={telegram} target="_blank" rel="noopener noreferrer">{contacts.telegramLabel}<ArrowUpRight size={18}/></a><a className="telegram-direct" href={telegram} target="_blank" rel="noopener noreferrer">{telegram.replace('https://','')}</a></div>
       <a className="button light contact-cta" href={telegram} target="_blank" rel="noopener noreferrer"><Send size={16}/>Связаться со мной<ArrowUpRight size={18}/></a>
     </div></div>
   </div>
 </div></section></main><footer className="shell footer"><a className="brand" href="#">NIKOLAY<span>✳</span></a><span>СОЗДАНО НА ПЕРЕСЕЧЕНИИ ДИЗАЙНА И ТЕХНОЛОГИЙ</span><a href="#">НАВЕРХ <ArrowUpRight size={14}/></a></footer></div></MotionConfig>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>)
