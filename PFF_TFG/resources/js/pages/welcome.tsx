import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import {
    AlertIcon,
    AppleIcon,
    ArrowDownIcon,
    ArrowRightIcon,
    BellIcon,
    BooksIcon,
    CalendarIcon,
    GridIcon,
    HomeIcon,
    LockIcon,
    MessageIcon,
    PlayIcon,
    PulseIcon,
    UserIcon,
} from '@/components/welcome/icons';
import {
    CourseProgressRow,
    FeatureCard,
    MobileNavItem,
    StatCard,
    StepCard,
} from '@/components/welcome/landing-components';
import type { FeatureItem, MoodleCourse, StepItem } from '@/components/welcome/landing-components';
import { dashboard, login } from '@/routes';

const marqueeItems = [
    'Compatible con Moodle 3.x y 4.x',
    'Disponible en iOS y Android',
    'Acceso web en cualquier navegador',
    'Sin plugins en el servidor',
    'Datos en tiempo real',
    'Sin publicidad ni suscripciones',
];

const phoneCourses: MoodleCourse[] = [
    { name: 'Matemáticas II', progress: 82, color: '#4F06F9' },
    { name: 'Física General', progress: 60, color: '#00d4a0' },
    { name: 'Programación I', progress: 45, color: '#f5a623' },
];

const features: FeatureItem[] = [
    {
        id: '001',
        title: 'Inicio de sesión unificado con tu cuenta Moodle',
        description:
            'Conecta directamente con tu instancia Moodle institucional. Tus credenciales nunca abandonan tu dispositivo. Sin cuentas intermedias, sin configuración adicional en el servidor.',
        highlighted: true,
        icon: <LockIcon />,
    },
    {
        id: '002',
        title: 'Cursos y materiales centralizados',
        description: 'Archivos, actividades y foros en un panel limpio y sin ruido visual.',
        icon: <BooksIcon />,
    },
    {
        id: '003',
        title: 'Progreso y calificaciones en tiempo real',
        description: 'Tu rendimiento académico con gráficos claros y datos siempre actualizados.',
        icon: <PulseIcon />,
    },
    {
        id: '004',
        title: 'Alertas de entrega precisas',
        description: 'Notificaciones antes de que se te pase un plazo crítico.',
        icon: <AlertIcon />,
    },
    {
        id: '005',
        title: 'Calendario académico unificado',
        description: 'Todas tus fechas clave sincronizadas en un único lugar.',
        icon: <CalendarIcon />,
    },
    {
        id: '006',
        title: 'Mensajes y foros integrados',
        description: 'Comunícate con profesores y compañeros sin abrir el navegador.',
        icon: <MessageIcon />,
    },
];

const steps: StepItem[] = [
    {
        id: '01',
        title: 'Accede a nuestra plataforma',
        description:
            'Regístrate e inicia sesión en nuestra plataforma. Es rápido, seguro y gratuito. No se requiere información adicional más allá de tu cuenta Moodle.',
    },
    {
        id: '02',
        title: 'Inicia sesión con tu cuenta',
        description:
            'Las mismas credenciales que usas en Moodle. Acceso directo, seguro y completamente privado; ni siquiera nuestros administradores tendrán acceso a tus credenciales.',
    },
    {
        id: '03',
        title: 'Accede a tu campus rediseñado',
        description:
            'Todos tus datos y cursos al instante. La misma información, una experiencia completamente diferente.',
    },
];

export default function Welcome() {
    const { auth } = usePage().props as { auth: { user: unknown | null } };
    const pageRef = useRef<HTMLElement | null>(null);

    const accessHref = auth.user ? dashboard() : login();

    useEffect(() => {
        const root = pageRef.current;

        if (!root) {
            return;
        }

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const supportsCustomCursor = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

        const revealElements = root.querySelectorAll<HTMLElement>('.reveal');

        if (prefersReducedMotion) {
            revealElements.forEach((element) => element.classList.add('vis'));
        }

        const observer = prefersReducedMotion
            ? null
            : new IntersectionObserver(
                  (entries, activeObserver) => {
                      entries.forEach((entry) => {
                          if (entry.isIntersecting) {
                              entry.target.classList.add('vis');
                              activeObserver.unobserve(entry.target);
                          }
                      });
                  },
                  { threshold: 0.07 },
              );

        if (observer) {
            revealElements.forEach((element) => observer.observe(element));
        }

        let rafId = 0;
        let mouseX = 0;
        let mouseY = 0;
        let ringX = 0;
        let ringY = 0;

        const cursor = root.querySelector<HTMLElement>('[data-cursor]');
        const ring = root.querySelector<HTMLElement>('[data-cursor-ring]');

        const hoverCleanup: Array<() => void> = [];

        if (!prefersReducedMotion && supportsCustomCursor && cursor && ring) {
            root.classList.add('is-cursor-enabled');

            const onPointerMove = (event: PointerEvent) => {
                mouseX = event.clientX;
                mouseY = event.clientY;

                cursor.style.left = `${mouseX}px`;
                cursor.style.top = `${mouseY}px`;
            };

            const animateCursor = () => {
                ringX += (mouseX - ringX) * 0.13;
                ringY += (mouseY - ringY) * 0.13;

                ring.style.left = `${ringX}px`;
                ring.style.top = `${ringY}px`;
                rafId = window.requestAnimationFrame(animateCursor);
            };

            const interactiveElements = root.querySelectorAll<HTMLElement>('a, button, .feat, .step, [role="button"]');

            interactiveElements.forEach((element) => {
                const onEnter = () => {
                    cursor.style.transform = 'translate(-50%, -50%) scale(1.8)';
                    ring.style.width = '52px';
                    ring.style.height = '52px';
                };

                const onLeave = () => {
                    cursor.style.transform = 'translate(-50%, -50%) scale(1)';
                    ring.style.width = '34px';
                    ring.style.height = '34px';
                };

                element.addEventListener('mouseenter', onEnter);
                element.addEventListener('mouseleave', onLeave);

                hoverCleanup.push(() => {
                    element.removeEventListener('mouseenter', onEnter);
                    element.removeEventListener('mouseleave', onLeave);
                });
            });

            window.addEventListener('pointermove', onPointerMove, { passive: true });
            rafId = window.requestAnimationFrame(animateCursor);

            hoverCleanup.push(() => {
                window.removeEventListener('pointermove', onPointerMove);
            });
        }

        return () => {
            if (observer) {
                observer.disconnect();
            }

            if (rafId) {
                window.cancelAnimationFrame(rafId);
            }

            hoverCleanup.forEach((cleanup) => cleanup());
            root.classList.remove('is-cursor-enabled');
        };
    }, []);

    return (
        <>
            <Head title="MoodleConnect" />

            <main className="p-welcome" ref={pageRef}>
                <span className="cursor" data-cursor aria-hidden="true" />
                <span className="cursor-ring" data-cursor-ring aria-hidden="true" />

                <header>
                    <nav aria-label="Navegación principal">
                        <p className="logo">Moodle<span>Connect</span></p>
                        <ul className="nav-right">
                            <li><a href="#feat" className="nav-link">Funciones</a></li>
                            <li><a href="#how" className="nav-link">Cómo funciona</a></li>
                            <li><a href="#dl" className="nav-link">Descargar</a></li>
                            <li>
                                <Link href={accessHref} className="nav-btn">Acceder</Link>
                            </li>
                        </ul>
                    </nav>
                </header>

                <section className="hero" aria-labelledby="welcome-hero-title">
                    <div className="hero-bg-panel" aria-hidden="true" />
                    <div className="hero-grid" aria-hidden="true" />

                    <article className="hero-left">
                        <p className="eyebrow">
                            <span className="eyebrow-bar" aria-hidden="true" />
                            <span className="eyebrow-txt">Plataforma educativa reimaginada</span>
                        </p>

                        <h1 className="hero-title" id="welcome-hero-title">
                            <span>TU MOODLE</span>
                            <span className="t-indent">DE OTRA</span>
                            <span className="t-accent">MANERA.</span>
                            <span className="t-outline">CONECTADO.</span>
                        </h1>

                        <section className="hero-sub" aria-label="Propuesta de valor">
                            <span className="sub-bar" aria-hidden="true" />
                            <p className="sub-txt">
                                Accede a todos tus cursos, calificaciones, tareas y mensajes de Moodle desde una interfaz moderna,
                                rápida y unificada. Disponible en web y móvil, sin compromisos.
                            </p>
                        </section>

                        <section className="hero-cta" aria-label="Acciones principales">
                            <a href="#dl" className="btn-main">
                                <ArrowRightIcon width={15} height={15} />
                                Empezar ahora
                            </a>
                            <a href="#how" className="btn-ghost">
                                Ver cómo funciona
                                <ArrowDownIcon width={14} height={14} />
                            </a>
                        </section>
                    </article>

                    <aside className="hero-right" aria-label="Vista previa de la aplicación móvil">
                        <article className="phone-scene">
                            <p className="ftag ftag-1" aria-hidden="true">
                                <span className="ftag-label">Progreso global</span>
                                <span className="ftag-val"><em>73%</em> completado</span>
                            </p>
                            <p className="ftag ftag-2" aria-hidden="true">
                                <span className="ftag-label">Próxima entrega</span>
                                <span className="ftag-val">Hoy <em>23:59</em></span>
                            </p>

                            <article className="phone-float" aria-hidden="true">
                                <span className="phone-glow" />
                                <section className="p-shell">
                                    <span className="p-btn-r" />
                                    <span className="p-btn-l1" />
                                    <span className="p-btn-l2" />
                                    <span className="p-btn-l3" />
                                    <section className="p-screen">
                                        <span className="p-island" />
                                        <section className="p-status">
                                            <span className="p-time">9:41</span>
                                            <span className="p-icons">
                                                <svg width="14" height="10" viewBox="0 0 14 10" fill="white" opacity="0.85"><rect x="0" y="3" width="2.5" height="7" rx="0.4" /><rect x="4" y="1.5" width="2.5" height="8.5" rx="0.4" /><rect x="8" y="0" width="2.5" height="10" rx="0.4" /><rect x="12" y="0" width="2" height="10" rx="0.4" opacity="0.28" /></svg>
                                                <svg width="13" height="10" viewBox="0 0 13 10" fill="white" opacity="0.85"><path d="M6.5 2.5C8.4 2.5 10.1 3.3 11.3 4.6L12.2 3.7C10.7 2.1 8.7 1 6.5 1S2.3 2.1.8 3.7l.9.9C2.9 3.3 4.6 2.5 6.5 2.5z" /><path d="M6.5 5c1.2 0 2.3.5 3.1 1.3L10.5 5.4C9.4 4.3 8 3.6 6.5 3.6S3.6 4.3 2.5 5.4l.9.9C4.2 5.5 5.3 5 6.5 5z" /><circle cx="6.5" cy="8.5" r="1.4" /></svg>
                                                <svg width="23" height="11" viewBox="0 0 23 11" fill="none" opacity="0.85"><rect x="0.5" y="0.5" width="19" height="10" rx="2.5" stroke="white" strokeOpacity="0.45" /><rect x="2" y="2" width="14" height="7" rx="1.5" fill="white" /><path d="M21 4v3a1.5 1.5 0 000-3z" fill="white" opacity="0.38" /></svg>
                                            </span>
                                        </section>
                                        <section className="p-body">
                                            <header className="p-toprow">
                                                <span className="p-appname">MoodleConnect</span>
                                                <span className="p-avatar">MG</span>
                                            </header>
                                            <p className="p-greet">Buenos días,</p>
                                            <p className="p-name">María García</p>
                                            <section className="p-stats">
                                                <StatCard scope="phone" value="4" label="Cursos" highlighted />
                                                <StatCard scope="phone" value="8.4" label="Nota" />
                                                <StatCard scope="phone" value="3" label="Tareas" />
                                            </section>
                                            <p className="p-slabel">Cursos activos</p>
                                            {phoneCourses.map((course) => (
                                                <CourseProgressRow course={course} scope="phone" key={course.name} />
                                            ))}
                                            <section className="p-task">
                                                <span className="p-task-l">
                                                    <span className="p-task-tag">Entrega urgente</span>
                                                    <span className="p-task-name">Práctica 3 - Integrales</span>
                                                </span>
                                                <span className="p-task-badge">Hoy</span>
                                            </section>
                                        </section>
                                        <nav className="p-nav" aria-label="Navegación móvil">
                                            <MobileNavItem active label="Inicio">
                                                <HomeIcon stroke="#4F06F9" />
                                            </MobileNavItem>
                                            <MobileNavItem label="Cursos">
                                                <GridIcon stroke="white" />
                                            </MobileNavItem>
                                            <MobileNavItem label="Avisos">
                                                <BellIcon stroke="white" />
                                            </MobileNavItem>
                                            <MobileNavItem label="Perfil">
                                                <UserIcon stroke="white" />
                                            </MobileNavItem>
                                        </nav>
                                    </section>
                                </section>
                            </article>
                        </article>
                    </aside>
                </section>

                <section className="marquee-band" aria-label="Compatibilidad y beneficios">
                    <section className="marquee-track" aria-hidden="true">
                        {[...marqueeItems, ...marqueeItems].map((item, index) => (
                            <p className="mq-item" key={`${item}-${index}`}>
                                <span className="mq-dot" />
                                {item}
                            </p>
                        ))}
                    </section>
                </section>

                <section className="features" id="feat" aria-labelledby="features-title">
                    <span className="feat-bg-num" aria-hidden="true">06</span>
                    <header className="feat-header reveal">
                        <h2 className="feat-title-big" id="features-title">
                            TODO LO<br />QUE<br />NECESITAS.
                            <em>NADA MÁS.</em>
                        </h2>
                        <p className="feat-intro">
                            Una interfaz que respeta tu tiempo y tu inteligencia. Sin ruido, sin clics de más. Solo tu información
                            académica, presentada con precisión y velocidad.
                        </p>
                    </header>
                    <section className="feat-grid reveal" aria-label="Funcionalidades principales">
                        {features.map((feature) => (
                            <FeatureCard feature={feature} key={feature.id} />
                        ))}
                    </section>
                </section>

                <section className="how" id="how" aria-labelledby="how-title">
                    <section className="how-inner">
                        <aside className="how-bar" aria-hidden="true">
                            <span className="how-bar-txt">Cómo funciona el proceso de conexión</span>
                        </aside>
                        <section className="how-body">
                            <h2 className="how-title reveal" id="how-title">CONECTADO EN<br /><em>TRES PASOS.</em></h2>

                            <section className="steps reveal" aria-label="Proceso de conexión">
                                {steps.map((step) => (
                                    <StepCard step={step} key={step.id} />
                                ))}
                            </section>

                            <article className="web-mock reveal" aria-label="Vista previa web">
                                <header className="wb-bar">
                                    <span className="wb-d" style={{ background: '#ff5f57' }} />
                                    <span className="wb-d" style={{ background: '#febc2e' }} />
                                    <span className="wb-d" style={{ background: '#28c840' }} />
                                    <span className="wb-url">app.moodleconnect.io / dashboard</span>
                                </header>
                                <section className="wb-body">
                                    <nav className="wb-side" aria-label="Menú lateral demo">
                                        <p className="wb-logo">MoodleConnect</p>
                                        <p className="wb-item on">Inicio</p>
                                        <p className="wb-item">Cursos</p>
                                        <p className="wb-item">Calendario</p>
                                        <p className="wb-item">Mensajes</p>
                                        <p className="wb-item">Perfil</p>
                                    </nav>
                                    <section className="wb-main">
                                        <h3 className="wb-greet">Bienvenida, María García</h3>
                                        <p className="wb-sub">Martes, 18 de marzo - 3 entregas esta semana</p>
                                        <section className="wb-stats">
                                            <StatCard scope="web" value="4" label="Cursos" highlighted />
                                            <StatCard scope="web" value="8.4" label="Nota media" />
                                            <StatCard scope="web" value="3" label="Pendientes" />
                                            <StatCard scope="web" value="73%" label="Progreso" />
                                        </section>
                                        <p className="wb-cl">Cursos activos</p>
                                        {phoneCourses.map((course) => (
                                            <CourseProgressRow course={course} scope="web" key={`wb-${course.name}`} />
                                        ))}
                                    </section>
                                </section>
                            </article>
                        </section>
                    </section>
                </section>

                <section className="dl-section" id="dl" aria-labelledby="download-title">
                    <section className="dl-inner">
                        <article className="dl-left reveal">
                            <p className="dl-eye">
                                <span className="dl-eye-bar" aria-hidden="true" />
                                <span className="dl-eye-txt">App móvil nativa</span>
                            </p>
                            <h2 className="dl-title" id="download-title">LLÉVALO<br />CONTIGO.</h2>
                            <p className="dl-desc">
                                App gratuita para iOS y Android. Notificaciones nativas, acceso a materiales y la misma experiencia
                                que en web, adaptada al móvil. Sin publicidad.
                            </p>
                            <section className="store-btns" aria-label="Plataformas disponibles">
                                <a href="#" className="store-btn" aria-label="Descargar en App Store">
                                    <AppleIcon />
                                    <span><span className="s-small">Descargar en</span><span className="s-name">App Store</span></span>
                                </a>
                                <a href="#" className="store-btn" aria-label="Descargar en Google Play">
                                    <PlayIcon />
                                    <span><span className="s-small">Disponible en</span><span className="s-name">Google Play</span></span>
                                </a>
                            </section>
                        </article>

                        <article className="dl-right reveal">
                            <section className="access-block">
                                <h3 className="access-label">Acceso web directo</h3>
                                <article className="url-field" aria-label="Ejemplo de URL Moodle">
                                    <span className="url-mini">URL de tu Moodle institucional</span>
                                    <p className="url-val">https://<em>campus.tuuniversidad.es</em></p>
                                </article>
                                <Link href={accessHref} className="access-btn">
                                    Conectar y acceder
                                    <ArrowRightIcon width={14} height={14} stroke="white" />
                                </Link>
                                <p className="access-note">
                                    Sin instalación de plugins en el servidor. <strong>Compatible con cualquier instancia Moodle 3.x y 4.x.</strong>
                                    {' '}Totalmente gratuito y sin límites de uso.
                                </p>
                            </section>
                        </article>
                    </section>
                </section>

                <footer>
                    <p className="f-logo">Moodle<em>Connect</em></p>
                    <ul className="f-nav">
                        <li><a href="#">Privacidad</a></li>
                        <li><a href="#">Términos</a></li>
                        <li><a href="#">Soporte</a></li>
                        <li><a href="#">Contacto</a></li>
                    </ul>
                    <p className="f-copy">2025 MoodleConnect. Todos los derechos reservados.</p>
                </footer>
            </main>
        </>
    );
}
