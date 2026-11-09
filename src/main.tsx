import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { motion, MotionConfig, useReducedMotion } from 'motion/react'
import { ArrowUpRight, ArrowDown, ArrowRight, Plus, Minus, Menu, X, Send, Mail, Code2, ExternalLink } from 'lucide-react'
import { projects } from './projects'
import './style.css'

const nav = [['Проекты', '#projects'], ['Обо мне', '#about'], ['Услуги', '#services'], ['Контакты', '#contact']]
const steps = [
  ['Обсуждение проекта', 'Знакомимся с вашей задачей, аудиторией и пожеланиями. Определяем, что сайт должен делать для вашего бизнеса.'],
  ['Структура и дизайн', 'Согласовываем разделы, визуальное направление и удобный путь посетителя к обращению.'],
  ['Разработка сайта', 'Превращаю согласованный дизайн в быстрый, адаптивный сайт с продуманными деталями.'],
  ['Проверка и правки', 'Проверяем сайт на разных экранах и вносим согласованные изменения перед запуском.'],
  ['Публикация проекта', 'Публикуем готовый сайт и проверяем его работу. Передаю инструкции для дальнейшего использования.'],
]
const services = [
 ['Лендинги', 'Одна страница — целостная история вашего продукта или услуги.'],
 ['Сайты для бизнеса', 'Понятное представление компании, её услуг и преимуществ.'],
 ['Мобильная адаптация', 'Удобный интерфейс на любом экране — от телефона до монитора.'],
 ['Обновление дизайна', 'Свежий взгляд на существующий сайт и его пользовательский опыт.'],
 ['Дополнительные функции', 'Новые возможности для вашего сайта по согласованию.'],
]
function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
 const reduced = useReducedMotion()
 return <motion.div className={className} initial={{ opacity: 0, y: reduced ? 0 : 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .15 }} transition={{ duration: .65 }}>{children}</motion.div>
}
function App() {
 const [menu, setMenu] = useState(false)
 const [activeStep, setActiveStep] = useState(0)
 const [notice, setNotice] = useState('')
 const reduced = useReducedMotion()
 const telegram = import.meta.env.VITE_TELEGRAM_URL?.trim()
 const email = import.meta.env.VITE_EMAIL?.trim()
 const validTelegram = telegram && /^https:\/\/t\.me\/[a-zA-Z0-9_+]+\/?$/.test(telegram)
 const validEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
 return <MotionConfig reducedMotion="user"><a className="skip" href="#main">Перейти к содержимому</a>
 <header className="header"><a className="logo" href="#" aria-label="Николай — на главную">н<span>.</span></a><nav className="desktop-nav" aria-label="Главная навигация">{nav.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav><a className="header-cta" href="#contact">На связи <span className="status-dot"/></a><button className="menu-button" onClick={() => setMenu(!menu)} aria-label={menu ? 'Закрыть меню' : 'Открыть меню'} aria-expanded={menu}>{menu ? <X/> : <Menu/>}</button></header>
 {menu && <nav className="mobile-nav" aria-label="Мобильная навигация">{nav.map(([label, href]) => <a key={href} href={href} onClick={() => setMenu(false)}>{label}<ArrowUpRight size={20}/></a>)}</nav>}
 <main id="main">
 <section className="hero shell"><motion.div className="eyebrow" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.1}}><span className="tiny-line"/> НЕЗАВИСИМЫЙ ВЕБ-РАЗРАБОТЧИК</motion.div>
 <motion.h1 initial={{opacity:0,y:reduced?0:35}} animate={{opacity:1,y:0}} transition={{duration:.9,delay:.2}}>Привет,<br/><span className="hero-bottom"><span className="muted">я</span> Николай<ArrowUpRight className="title-mark" aria-hidden="true" strokeWidth={1}/></span></motion.h1>
 <motion.div className="hero-info" initial={{opacity:0,y:reduced?0:20}} animate={{opacity:1,y:0}} transition={{duration:.7,delay:.5}}><div className="hero-note"><span className="cross">+</span><span>Идея. Форма. Код.<br/>Всё начинается с вашей задачи.</span></div><div className="hero-copy"><p>Разрабатываю современные сайты, которые помогают бизнесу выделяться в интернете.</p><div className="actions"><a className="button primary" href="#projects">Смотреть проекты <ArrowUpRight size={18}/></a><a className="text-button" href="#contact">Обсудить проект <ArrowUpRight size={17}/></a></div></div></motion.div>
 <div className="hero-footer"><span>ПРОДУМАНО ДО ПОСЛЕДНЕГО ПИКСЕЛЯ</span><a href="#projects" aria-label="Прокрутить к проектам"><ArrowDown size={18}/> ЛИСТАЙТЕ НИЖЕ</a></div>
 </section>
 <section id="projects" className="section shell"><Reveal className="section-top"><div><div className="eyebrow">01 / ИЗБРАННОЕ</div><h2>Работа говорит<span className="muted"> сама за себя.</span></h2></div><span className="section-aside">От идеи до работающего сайта</span></Reveal>
 <div className="project-grid">{projects.map((project, i) => <Reveal className={`project-card ${project.upcoming ? 'upcoming' : ''}`} key={project.name}><div className="project-visual">{project.image ? <img src={project.image} alt={`Скриншот сайта ${project.name}`} loading="lazy"/> : project.upcoming ? <div className="placeholder-art"><Plus strokeWidth={1}/><span>ВАШ ПРОЕКТ МОЖЕТ БЫТЬ ЗДЕСЬ</span></div> : <div className="aura-art"><span className="mockup-label">КОНЦЕПЦИЯ ПРЕВЬЮ</span><div className="aura-nav"><span>AURA</span><span>BEAUTY STUDIO ↗</span></div><div className="aura-content"><span>ПРОСТРАНСТВО ВАШЕЙ КРАСОТЫ</span><strong>Красота<br/><em>в деталях.</em></strong><span className="aura-small">Время, посвящённое себе.</span><span className="aura-pill">Открыть новую себя ↗</span></div><div className="aura-sculpture"><div/><div/><div/></div><span className="aura-bottom">AURA BEAUTY — ДЕМОНСТРАЦИОННЫЙ ПРОЕКТ</span></div>}{!project.upcoming && <a className="project-open" href={project.url} target="_blank" rel="noopener noreferrer" aria-label="Открыть AURA BEAUTY в новой вкладке"><ArrowUpRight/></a>}</div><div className="project-meta"><div><span className="project-category">{project.category}</span><h3>{project.name}</h3></div><span className="project-number">0{i+1}</span></div><p className="project-description">{project.description}</p><div className="project-details"><span>{project.technologies.length ? project.technologies.join(' / ') : project.upcoming ? 'Технологии — под задачу' : 'Технологии уточняются'}</span>{project.url ? <a href={project.url} target="_blank" rel="noopener noreferrer">Смотреть сайт <ExternalLink size={13}/></a> : <span>В разработке портфолио</span>}</div></Reveal>)}</div>
 </section>
 <section id="about" className="about section shell"><Reveal className="about-label"><div className="eyebrow">02 / ОБО МНЕ</div><div className="code-symbol"><Code2 size={52} strokeWidth={1}/><span>Дизайн с мыслью.<br/>Код со смыслом.</span></div></Reveal><Reveal className="about-copy"><h2>Красивый сайт —<br/>это только <span className="muted">начало.</span></h2><p>Меня зовут Николай. Я занимаюсь созданием современных, удобных и адаптивных сайтов для бизнеса. Для меня важно, чтобы сайт не только красиво выглядел, но и помогал компании представлять свои услуги и получать обращения от потенциальных клиентов.</p><div className="principles"><span>Чистый дизайн</span><span>Удобство</span><span>Внимание к деталям</span></div></Reveal></section>
 <section id="services" className="section services shell"><Reveal className="section-top"><div><div className="eyebrow">03 / ЧЕМ МОГУ ПОМОЧЬ</div><h2>Ваши задачи.<br/><span className="muted">Мои решения.</span></h2></div><p className="section-aside">От первой страницы<br/>до нового этапа вашего бизнеса.</p></Reveal><div className="service-list">{services.map(([title, description], i) => <Reveal key={title}><div className="service-row"><span className="service-index">0{i+1}</span><h3>{title}</h3><p>{description}</p><ArrowUpRight className="service-arrow" size={25} strokeWidth={1}/></div></Reveal>)}</div></section>
 <section id="process" className="section process shell"><Reveal><div className="eyebrow">04 / ПРОЦЕСС</div><div className="process-heading"><h2>Понятный путь<br/><span className="muted">к результату.</span></h2><p>На каждом этапе вы знаете,<br/>что происходит с вашим проектом.</p></div></Reveal><div className="timeline">{steps.map(([title, description], i) => <div className={`step ${activeStep === i ? 'active' : ''}`} key={title}><button onClick={() => setActiveStep(i)} aria-expanded={activeStep === i} aria-controls={`step-${i}`}><span className="step-node">0{i+1}</span><span>{title}</span>{activeStep === i ? <Minus size={18}/> : <Plus size={18}/>}</button><motion.div id={`step-${i}`} initial={false} animate={{height: activeStep === i ? 'auto' : 0, opacity: activeStep === i ? 1 : 0}} transition={{duration:reduced?0:.3}} className="step-content" inert={activeStep !== i}><p>{description}</p></motion.div></div>)}</div></section>
 <section id="contact" className="contact"><div className="shell"><Reveal><div className="eyebrow"><span className="status-dot"/> ДАВАЙТЕ СОЗДАДИМ ЧТО-ТО ХОРОШЕЕ</div><h2>Есть идея?<br/>Давайте реализуем<br/><span>её вместе.</span><ArrowUpRight className="contact-arrow" strokeWidth={1}/></h2><div className="contact-bottom"><p>Расскажите о своей задаче.<br/>Начнём с простого разговора.</p><div className="actions">{validTelegram ? <a className="button primary" href={telegram} target="_blank" rel="noopener noreferrer"><Send size={17}/> Telegram <ArrowUpRight size={17}/></a> : <button className="button primary" onClick={() => setNotice('Telegram пока не указан. Контакты появятся здесь позже.')}><Send size={17}/> Telegram <ArrowUpRight size={17}/></button>}{validEmail ? <a className="button outline" href={`mailto:${email}`}><Mail size={17}/> Email <ArrowUpRight size={17}/></a> : <button className="button outline" onClick={() => setNotice('Email пока не указан. Контакты появятся здесь позже.')}><Mail size={17}/> Email <ArrowUpRight size={17}/></button>}</div></div><p role="status" className="contact-notice">{notice}</p></Reveal></div></section>
 </main><footer className="footer shell"><a className="footer-name" href="#">Николай<span>.</span></a><span>Веб-разработка с вниманием к вашему бизнесу</span><a href="#">Наверх <ArrowUpRight size={15}/></a></footer>
 </MotionConfig>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>)
