import { Head, Link } from '@inertiajs/react';
import { Bell, Search, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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

type MatrixTask = {
    title: string;
    course: string;
    reason: string;
    link?: string | null;
};

type EisenhowerMatrix = {
    doNow: MatrixTask[];
    schedule: MatrixTask[];
    delegate: MatrixTask[];
    optimize: MatrixTask[];
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
        link?: string | null;
    };
    eisenhower: EisenhowerMatrix;
    matrixExplanation: string | null;
    matrixProvider: string;
    profileAvatarUrl: string | null;
    dashboardError: string | null;
};

export default function Dashboard({ moodleConnected, quickCards, timeline, hero, eisenhower, matrixExplanation, matrixProvider, profileAvatarUrl, dashboardError }: DashboardProps) {
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

                                {hero.link ? (
                                    <a className="p-dashboard__hero-action" href={hero.link} target="_blank" rel="noreferrer">
                                        Ir a la tarea
                                    </a>
                                ) : (
                                    <button className="p-dashboard__hero-action" type="button" disabled>
                                        Sin tarea enlazada
                                    </button>
                                )}
                            </article>

                            <section className="p-dashboard__quick" aria-labelledby="quick-view-title">
                                <header className="p-dashboard__quick-header">
                                    <h3 id="quick-view-title">Vista rapida</h3>
                                    <section className="p-dashboard__quick-actions" aria-label="Acciones de asignaturas">
                                        <Link className="p-dashboard__quick-link" href="/asignaturas">
                                            Ver asignaturas
                                        </Link>
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

                            <section className="p-dashboard__matrix" aria-labelledby="matrix-title">
                                <header className="p-dashboard__matrix-header">
                                    <h3 id="matrix-title">Matriz de Eisenhower Academica IA</h3>
                                    <p>
                                        La IA prioriza tus tareas por urgencia, relevancia academica y estado real de entrega para recomendarte un
                                        flujo de trabajo claro: hacer ahora, planificar, resolver rapido u optimizar tiempo.
                                    </p>
                                    <section className="p-dashboard__matrix-tools" aria-label="Herramientas de explicacion IA">
                                        <Link className="p-dashboard__matrix-explain" href="/dashboard?explicar_matriz=1">
                                            Obtener explicacion
                                        </Link>
                                        {matrixProvider !== 'ai' && (
                                            <small className="p-dashboard__matrix-hint">La IA no esta disponible o no esta configurada.</small>
                                        )}
                                    </section>
                                </header>

                                {matrixExplanation && (
                                    <article className="p-dashboard__matrix-explanation" aria-label="Explicacion IA de la matriz">
                                        <p>{matrixExplanation}</p>
                                    </article>
                                )}

                                <section className="p-dashboard__matrix-grid">
                                    <article className="p-dashboard__matrix-card is-critical" aria-label="Urgente e importante">
                                        <header>
                                            <strong>Hacer ahora</strong>
                                            <small>Urgente + importante</small>
                                        </header>
                                        <ul>
                                            {eisenhower.doNow.map((task) => (
                                                <li key={`do-now-${task.course}-${task.title}`}>
                                                    <section>
                                                        <h4>{task.title}</h4>
                                                        <p>{task.course} · {task.reason}</p>
                                                    </section>
                                                    {task.link && (
                                                        <a href={task.link} target="_blank" rel="noreferrer">
                                                            Ir
                                                        </a>
                                                    )}
                                                </li>
                                            ))}
                                            {eisenhower.doNow.length === 0 && <li className="is-empty">Sin tareas criticas detectadas</li>}
                                        </ul>
                                    </article>

                                    <article className="p-dashboard__matrix-card" aria-label="No urgente e importante">
                                        <header>
                                            <strong>Planificar</strong>
                                            <small>Importante + no urgente</small>
                                        </header>
                                        <ul>
                                            {eisenhower.schedule.map((task) => (
                                                <li key={`schedule-${task.course}-${task.title}`}>
                                                    <section>
                                                        <h4>{task.title}</h4>
                                                        <p>{task.course} · {task.reason}</p>
                                                    </section>
                                                    {task.link && (
                                                        <a href={task.link} target="_blank" rel="noreferrer">
                                                            Ir
                                                        </a>
                                                    )}
                                                </li>
                                            ))}
                                            {eisenhower.schedule.length === 0 && <li className="is-empty">Sin tareas para planificar</li>}
                                        </ul>
                                    </article>

                                    <article className="p-dashboard__matrix-card" aria-label="Urgente y menos importante">
                                        <header>
                                            <strong>Resolver rapido</strong>
                                            <small>Urgente + menor impacto</small>
                                        </header>
                                        <ul>
                                            {eisenhower.delegate.map((task) => (
                                                <li key={`delegate-${task.course}-${task.title}`}>
                                                    <section>
                                                        <h4>{task.title}</h4>
                                                        <p>{task.course} · {task.reason}</p>
                                                    </section>
                                                    {task.link && (
                                                        <a href={task.link} target="_blank" rel="noreferrer">
                                                            Ir
                                                        </a>
                                                    )}
                                                </li>
                                            ))}
                                            {eisenhower.delegate.length === 0 && <li className="is-empty">Sin tareas de ejecucion rapida</li>}
                                        </ul>
                                    </article>

                                    <article className="p-dashboard__matrix-card" aria-label="No urgente y menos importante">
                                        <header>
                                            <strong>Optimizar</strong>
                                            <small>Menor impacto + baja urgencia</small>
                                        </header>
                                        <ul>
                                            {eisenhower.optimize.map((task) => (
                                                <li key={`optimize-${task.course}-${task.title}`}>
                                                    <section>
                                                        <h4>{task.title}</h4>
                                                        <p>{task.course} · {task.reason}</p>
                                                    </section>
                                                    {task.link && (
                                                        <a href={task.link} target="_blank" rel="noreferrer">
                                                            Ir
                                                        </a>
                                                    )}
                                                </li>
                                            ))}
                                            {eisenhower.optimize.length === 0 && <li className="is-empty">Sin tareas para optimizar</li>}
                                        </ul>
                                    </article>
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
                                {timeline.map((event, index) => (
                                    <li key={`${event.title}-${event.when}-${index}`} className={event.current ? 'is-current' : ''}>
                                        <p className="p-dashboard__timeline-time">{event.when}</p>
                                        <h4>{event.title}</h4>
                                        <p>{event.description}</p>
                                        {event.link && (
                                            <a className="p-dashboard__timeline-link" href={event.link} target="_blank" rel="noreferrer">
                                                Abrir actividad
                                            </a>
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
