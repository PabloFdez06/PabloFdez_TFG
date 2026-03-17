import { Head, Link } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { Bell, Grid2X2, LayoutList, Search, Sparkles } from 'lucide-react';

type QuickCard = {
    code: string;
    title: string;
    status: string;
    muted?: boolean;
    accent?: boolean;
};

type TimelineItem = {
    when: string;
    title: string;
    description: string;
    link?: string;
    current?: boolean;
};

type DashboardProps = {
    moodleConnected: boolean;
    studentName: string | null;
    quickCards: QuickCard[];
    timeline: TimelineItem[];
    hero: {
        reference: string;
        title: string;
        highlight: string;
        remaining: string;
        priority: string;
    };
    profileAvatarUrl: string | null;
    dashboardError: string | null;
};

export default function Dashboard({ moodleConnected, quickCards, timeline, hero, profileAvatarUrl, dashboardError }: DashboardProps) {
    const leftColumnRef = useRef<HTMLElement | null>(null);
    const timelineContainerRef = useRef<HTMLElement | null>(null);
    const timelineListRef = useRef<HTMLOListElement | null>(null);
    const [timelineMaxHeight, setTimelineMaxHeight] = useState<number | null>(null);

    useEffect(() => {
        const updateTimelineHeight = () => {
            const leftColumn = leftColumnRef.current;
            const timelineContainer = timelineContainerRef.current;
            const timelineList = timelineListRef.current;

            if (!leftColumn || !timelineContainer || !timelineList) {
                return;
            }

            const leftHeight = leftColumn.getBoundingClientRect().height;
            const timelineTopOffset = timelineList.getBoundingClientRect().top - timelineContainer.getBoundingClientRect().top;
            const maxHeight = Math.max(180, Math.floor(leftHeight - timelineTopOffset));

            setTimelineMaxHeight(maxHeight);
        };

        updateTimelineHeight();

        const observer = new ResizeObserver(() => {
            updateTimelineHeight();
        });

        if (leftColumnRef.current) {
            observer.observe(leftColumnRef.current);
        }

        window.addEventListener('resize', updateTimelineHeight);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateTimelineHeight);
        };
    }, [timeline.length]);

    return (
        <>
            <Head title="Dashboard" />

            <article className="p-dashboard">
                <header className="p-dashboard__topbar">
                    <section className="p-dashboard__container">
                        <section className="p-dashboard__left-group">
                            <section className="p-dashboard__brand">
                                <span className="p-dashboard__logo" aria-hidden="true">
                                    <Sparkles size={14} />
                                </span>
                                <strong>Academia</strong>
                            </section>

                            <nav className="p-dashboard__nav" aria-label="Secciones principales">
                                <Link className="is-active" href="/dashboard">Dashboard</Link>
                                <Link href="/asignaturas">Asignaturas</Link>
                                <Link href="/calificaciones">Calificaciones</Link>
                            </nav>
                        </section>

                        <section className="p-dashboard__toolbar" aria-label="Herramientas">
                            <label className="p-dashboard__search">
                                <Search aria-hidden="true" />
                                <input type="search" placeholder="Buscar entregables..." />
                            </label>
                            <button className="p-dashboard__icon-btn" type="button" aria-label="Notificaciones">
                                <Bell size={16} />
                            </button>
                            <span className="p-dashboard__avatar" aria-hidden="true">
                                {profileAvatarUrl && <img src={profileAvatarUrl} alt="Avatar Moodle" />}
                            </span>
                        </section>
                    </section>
                </header>

                <main className="p-dashboard__main p-dashboard__container">
                    <section className="p-dashboard__grid">
                        <section className="p-dashboard__left-column" ref={leftColumnRef}>
                            <section className="p-dashboard__label" aria-label="Prioridad actual">
                                <span>Urgente</span>
                                <i aria-hidden="true" />
                            </section>

                            <article className="p-dashboard__hero">
                                <p className="p-dashboard__hero-code">{hero.reference}</p>
                                <h1 className="p-dashboard__hero-title">
                                    {hero.title}
                                    <em>{hero.highlight}</em>
                                </h1>

                                <section className="p-dashboard__hero-meta">
                                    <section className="p-dashboard__hero-kpi">
                                        <small>Restante</small>
                                        <b className="is-brand">{hero.remaining}</b>
                                    </section>
                                    <span className="p-dashboard__hero-divider" aria-hidden="true" />
                                    <section className="p-dashboard__hero-kpi">
                                        <small>Prioridad</small>
                                        <b>{hero.priority}</b>
                                    </section>
                                </section>

                                <button className="p-dashboard__hero-action" type="button">
                                    Subir archivo
                                </button>
                            </article>

                            <section className="p-dashboard__quick" aria-labelledby="quick-view-title">
                                <header className="p-dashboard__quick-header">
                                    <h3 id="quick-view-title">Vista rapida</h3>
                                    <section className="p-dashboard__quick-actions" aria-label="Acciones de asignaturas">
                                        <Link className="p-dashboard__quick-link" href="/asignaturas">
                                            Ver asignaturas
                                        </Link>
                                        <section className="p-dashboard__view-btns" aria-label="Cambiar vista">
                                            <button type="button" aria-label="Vista de cuadricula">
                                                <Grid2X2 size={13} />
                                            </button>
                                            <button type="button" aria-label="Vista de lista">
                                                <LayoutList size={13} />
                                            </button>
                                        </section>
                                    </section>
                                </header>

                                <section className="p-dashboard__subjects">
                                    {quickCards.map((card) => (
                                        <Link
                                            href="/asignaturas"
                                            key={card.code}
                                            className={[
                                                'p-dashboard__subject',
                                                card.muted ? 'p-dashboard__subject--muted' : '',
                                                card.accent ? 'p-dashboard__subject--accent' : '',
                                            ]
                                                .filter(Boolean)
                                                .join(' ')}
                                        >
                                            <section className="p-dashboard__subject-top">
                                                <section>
                                                    <small className="p-dashboard__subject-code">{card.code}</small>
                                                    <h4>{card.title}</h4>
                                                </section>
                                                <span className="p-dashboard__dot" aria-hidden="true" />
                                            </section>
                                            <section className="p-dashboard__subject-bottom">
                                                <p>{card.status}</p>
                                                <span aria-hidden="true">→</span>
                                            </section>
                                        </Link>
                                    ))}

                                    {quickCards.length === 0 && (
                                        <article className="p-dashboard__subject">
                                            <section className="p-dashboard__subject-top">
                                                <section>
                                                    <small className="p-dashboard__subject-code">SIN-DATOS</small>
                                                    <h4>Sin asignaturas cargadas</h4>
                                                </section>
                                                <span className="p-dashboard__dot p-dashboard__dot--muted" aria-hidden="true" />
                                            </section>
                                            <section className="p-dashboard__subject-bottom">
                                                <p>
                                                    {moodleConnected
                                                        ? 'No hay datos de asignaturas para mostrar'
                                                        : 'Conecta Moodle para cargar tus asignaturas'}
                                                </p>
                                                <span aria-hidden="true">→</span>
                                            </section>
                                        </article>
                                    )}
                                </section>
                            </section>
                        </section>

                        <aside className="p-dashboard__timeline" aria-labelledby="timeline-title" ref={timelineContainerRef}>
                            <h2 id="timeline-title">Linea de tiempo</h2>
                            <p className="p-dashboard__timeline-subtitle">Tareas con entregas mas proximas</p>
                            <ol
                                className="p-dashboard__timeline-list"
                                ref={timelineListRef}
                                style={timelineMaxHeight ? { maxHeight: `${timelineMaxHeight}px` } : undefined}
                            >
                                {timeline.map((event) => (
                                    <li key={event.title} className={event.current ? 'is-current' : ''}>
                                        <p className="p-dashboard__timeline-time">{event.when}</p>
                                        <h4>{event.title}</h4>
                                        <p>{event.description}</p>
                                        {event.link && (
                                            <button className="p-dashboard__timeline-link" type="button">
                                                Abrir actividad
                                            </button>
                                        )}
                                    </li>
                                ))}

                                {timeline.length === 0 && (
                                    <li>
                                        <p className="p-dashboard__timeline-time">SIN EVENTOS</p>
                                        <h4>No hay entregas proximas</h4>
                                        <p>
                                            {dashboardError
                                                ? dashboardError
                                                : moodleConnected
                                                    ? 'No se encontraron tareas con fecha de entrega.'
                                                    : 'Conecta Moodle para ver tu cronograma.'}
                                        </p>
                                    </li>
                                )}
                            </ol>
                        </aside>
                    </section>
                </main>
            </article>
        </>
    );
}
