import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import AcademiaHeader from '@/components/academia-header';

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
    matrixMode: 'basic' | 'ai';
    matrixPreferences: string;
    matrixIncludeExplanation: boolean;
    profileAvatarUrl: string | null;
    dashboardError: string | null;
};

const TIMELINE_BATCH_SIZE = 2;

export default function Dashboard({
    moodleConnected,
    studentName,
    quickCards,
    timeline,
    hero,
    eisenhower,
    matrixExplanation,
    matrixProvider,
    matrixMode,
    matrixPreferences,
    matrixIncludeExplanation,
    profileAvatarUrl,
    dashboardError,
}: DashboardProps) {
    const leftColumnRef = useRef<HTMLElement | null>(null);
    const heroCardRef = useRef<HTMLElement | null>(null);
    const timelineContainerRef = useRef<HTMLElement | null>(null);
    const timelineListRef = useRef<HTMLOListElement | null>(null);
    const timelineActionsRef = useRef<HTMLDivElement | null>(null);

    const [timelineMaxHeight, setTimelineMaxHeight] = useState<number | null>(null);
    const [timelineListOffset, setTimelineListOffset] = useState(0);
    const [visibleTimelineItems, setVisibleTimelineItems] = useState(TIMELINE_BATCH_SIZE);

    const visibleTimeline = timeline.slice(0, visibleTimelineItems);
    const hasMoreTimelineItems = visibleTimelineItems < timeline.length;
    const canShowTimelineControls = timeline.length > TIMELINE_BATCH_SIZE;
    const canShowLessTimelineItems = visibleTimelineItems > TIMELINE_BATCH_SIZE;
    const isAiMode = matrixMode === 'ai';
    const matrixStateLabel = (() => {
        if (!isAiMode) {
            return 'Estado: Logica base activa';
        }

        if (matrixProvider === 'ai') {
            return 'Estado: IA activa';
        }

        if (matrixProvider === 'gemini') {
            return 'Estado: Gemini activa';
        }

        if (matrixProvider === 'missing-api-key') {
            return 'Estado: IA seleccionada (falta API key)';
        }

        if (matrixProvider === 'ai-idle') {
            return 'Estado: IA seleccionada (pendiente de ejecutar)';
        }

        return `Estado: IA seleccionada (${matrixProvider})`;
    })();

    const { data, setData, post, processing, errors } = useForm({
        matrix_mode: matrixMode,
        ai_api_key: '',
        matrix_preferences: matrixPreferences ?? '',
        matrix_include_explanation: matrixIncludeExplanation,
    });

    useEffect(() => {
        setData('matrix_mode', matrixMode);
        setData('matrix_preferences', matrixPreferences ?? '');
        setData('matrix_include_explanation', matrixIncludeExplanation);
    }, [matrixMode, matrixPreferences, matrixIncludeExplanation, setData]);

    useEffect(() => {
        const updateTimelineHeight = () => {
            const leftColumn = leftColumnRef.current;
            const heroCard = heroCardRef.current;
            const timelineContainer = timelineContainerRef.current;
            const timelineList = timelineListRef.current;
            const timelineActions = timelineActionsRef.current;

            if (!leftColumn || !heroCard || !timelineContainer || !timelineList) {
                return;
            }

            const leftHeight = leftColumn.getBoundingClientRect().height;
            const timelineTopOffset = timelineList.getBoundingClientRect().top - timelineContainer.getBoundingClientRect().top;
            const timelineActionsHeight = timelineActions ? timelineActions.getBoundingClientRect().height + 16 : 0;
            const maxHeight = Math.max(180, Math.floor(leftHeight - timelineTopOffset - timelineActionsHeight));

            setTimelineMaxHeight(maxHeight);

            const heroTop = heroCard.getBoundingClientRect().top;
            const timelineFirstItemTop = timelineList.getBoundingClientRect().top;
            const alignmentDelta = heroTop - timelineFirstItemTop;

            if (Math.abs(alignmentDelta) > 0.5) {
                setTimelineListOffset((currentOffset) => currentOffset + alignmentDelta);
            }
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
    }, [timeline.length, hasMoreTimelineItems]);

    return (
        <>
            <Head title="Dashboard" />

            <article className="p-dashboard">
                <AcademiaHeader
                    containerClassName="p-dashboard__container"
                    activePath="/dashboard"
                    profileAvatarUrl={profileAvatarUrl}
                    studentName={studentName}
                />

                <main className="p-dashboard__main p-dashboard__container">
                    <section className="p-dashboard__grid">
                        <section className="p-dashboard__left-column" ref={leftColumnRef}>
                            <section className="p-dashboard__label" aria-label="Prioridad actual">
                                <span>Status: Prioridad critica</span>
                                <i aria-hidden="true" />
                            </section>

                            <article className="p-dashboard__hero" ref={heroCardRef}>
                                <section className="p-dashboard__hero-main">
                                    <header className="p-dashboard__hero-head">
                                        <span className="p-dashboard__hero-tag">{hero.reference}</span>
                                        <p className="p-dashboard__hero-priority">• {hero.highlight || 'PRIORIDAD ALTA'}</p>
                                    </header>

                                    <h1 className="p-dashboard__hero-title">{hero.title}</h1>

                                    <section className="p-dashboard__hero-meta">
                                        <section className="p-dashboard__hero-kpi">
                                            <small>Tiempo restante</small>
                                            <b className="is-critical">{hero.remaining}</b>
                                        </section>
                                        <span className="p-dashboard__hero-divider" aria-hidden="true" />
                                        <section className="p-dashboard__hero-kpi">
                                            <small>Impacto</small>
                                            <b>{hero.priority}</b>
                                        </section>
                                    </section>

                                    <a
                                        className="p-dashboard__hero-action"
                                        href={hero.link && hero.link !== '' ? hero.link : '/asignaturas'}
                                        target={hero.link && hero.link !== '' ? '_blank' : undefined}
                                        rel={hero.link && hero.link !== '' ? 'noreferrer' : undefined}
                                    >
                                        <span>IR A LA TAREA</span>
                                    </a>
                                </section>

                                <aside className="p-dashboard__hero-side" aria-hidden="true">
                                    <span className="p-dashboard__hero-index">01</span>
                                </aside>
                            </article>

                            <section className="p-dashboard__quick" aria-labelledby="quick-view-title">
                                <header className="p-dashboard__quick-header">
                                    <section>
                                        <h3 id="quick-view-title">Vista rapida</h3>
                                        <p className="p-dashboard__quick-subtitle">Progreso del semestre actual</p>
                                    </section>
                                    <section className="p-dashboard__quick-actions" aria-label="Acciones de asignaturas">
                                        <Link className="p-dashboard__quick-link" href="/asignaturas">
                                            Ver asignaturas
                                        </Link>
                                    </section>
                                </header>

                                <section className="p-dashboard__subjects">
                                    {quickCards.slice(0, 4).map((card) => (
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
                                    <h3 id="matrix-title">Matriz de Eisenhower</h3>
                                    <section className="p-dashboard__matrix-tools" aria-label="Herramientas de explicacion IA">
                                        <nav className="p-dashboard__matrix-mode" aria-label="Selector de modo de matriz">
                                            <Link
                                                className={['p-dashboard__matrix-mode-link', !isAiMode ? 'is-active' : ''].filter(Boolean).join(' ')}
                                                href="/dashboard?matrix_mode=basic"
                                                preserveScroll
                                            >
                                                Logica base
                                            </Link>
                                            <Link
                                                className={['p-dashboard__matrix-mode-link', isAiMode ? 'is-active' : ''].filter(Boolean).join(' ')}
                                                href="/dashboard?matrix_mode=ai"
                                                preserveScroll
                                            >
                                                IA asistida
                                            </Link>
                                        </nav>

                                        <small
                                            className={['p-dashboard__matrix-hint', matrixProvider === 'ai' || matrixProvider === 'gemini' ? 'is-ai' : '']
                                                .filter(Boolean)
                                                .join(' ')}
                                        >
                                            {matrixStateLabel}
                                        </small>
                                    </section>
                                </header>

                                <p className="p-dashboard__matrix-mode-help">
                                    Usa <strong>Logica base</strong> para una priorizacion instantanea y estable. Cambia a <strong>IA asistida</strong> si quieres
                                    feedback personalizado por asignatura, contexto o preferencias concretas.
                                </p>

                                {isAiMode && (
                                    <form
                                        className="p-dashboard__matrix-ai-form"
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            post('/dashboard/matrix', {
                                                preserveState: true,
                                                preserveScroll: true,
                                            });
                                        }}
                                    >
                                        <input type="hidden" name="matrix_mode" value={data.matrix_mode} />

                                        <label htmlFor="matrix-ai-api-key">API key IA</label>
                                        <input
                                            id="matrix-ai-api-key"
                                            name="ai_api_key"
                                            type="password"
                                            value={data.ai_api_key}
                                            onChange={(event) => setData('ai_api_key', event.target.value)}
                                            placeholder="Introduce tu API key"
                                            autoComplete="off"
                                        />

                                        <label htmlFor="matrix-ai-preferences">Enfoque personalizado</label>
                                        <textarea
                                            id="matrix-ai-preferences"
                                            name="matrix_preferences"
                                            value={data.matrix_preferences}
                                            onChange={(event) => setData('matrix_preferences', event.target.value)}
                                            rows={3}
                                            placeholder="Ejemplo: prioriza Algebra y tareas evaluables de esta semana"
                                        />

                                        <label className="p-dashboard__matrix-ai-check" htmlFor="matrix-ai-explanation">
                                            <input
                                                id="matrix-ai-explanation"
                                                name="matrix_include_explanation"
                                                type="checkbox"
                                                checked={data.matrix_include_explanation}
                                                onChange={(event) => setData('matrix_include_explanation', event.target.checked)}
                                            />
                                            <span className="p-dashboard__matrix-ai-check-text">Incluir feedback explicativo y recomendaciones por cuadrante</span>
                                        </label>

                                        {(errors.ai_api_key || errors.matrix_preferences) && (
                                            <p className="p-dashboard__matrix-ai-error">{errors.ai_api_key || errors.matrix_preferences}</p>
                                        )}

                                        <button type="submit" disabled={processing}>
                                            {processing ? 'Analizando...' : 'Iniciar analisis IA'}
                                        </button>
                                    </form>
                                )}

                                {matrixExplanation && (
                                    <article className="p-dashboard__matrix-explanation" aria-label="Explicacion IA de la matriz">
                                        <p>{matrixExplanation}</p>
                                    </article>
                                )}

                                <section className="p-dashboard__matrix-grid">
                                    <article className="p-dashboard__matrix-card is-critical" aria-label="Urgente e importante">
                                        <header>
                                            <strong>Hacer ahora</strong>
                                            <small>Urgente</small>
                                        </header>
                                        <ul>
                                            {eisenhower.doNow.map((task) => (
                                                <li key={`do-now-${task.course}-${task.title}`}>
                                                    <section>
                                                        <h4>{task.title}</h4>
                                                        <p>{task.course}</p>
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
                                            <strong>Programar</strong>
                                            <small>Planificar</small>
                                        </header>
                                        <ul>
                                            {eisenhower.schedule.map((task) => (
                                                <li key={`schedule-${task.course}-${task.title}`}>
                                                    <section>
                                                        <h4>{task.title}</h4>
                                                        <p>{task.course}</p>
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
                                            <strong>Delegar</strong>
                                            <small>Rapido</small>
                                        </header>
                                        <ul>
                                            {eisenhower.delegate.map((task) => (
                                                <li key={`delegate-${task.course}-${task.title}`}>
                                                    <section>
                                                        <h4>{task.title}</h4>
                                                        <p>{task.course}</p>
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
                                            <strong>Eliminar</strong>
                                            <small>Reducir ruido</small>
                                        </header>
                                        <ul>
                                            {eisenhower.optimize.map((task) => (
                                                <li key={`optimize-${task.course}-${task.title}`}>
                                                    <section>
                                                        <h4>{task.title}</h4>
                                                        <p>{task.course}</p>
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
                            <header className="p-dashboard__timeline-header">
                                <h2 id="timeline-title">Linea de tiempo</h2>
                            </header>
                            <ol
                                className="p-dashboard__timeline-list"
                                ref={timelineListRef}
                                style={{
                                    ...(timelineMaxHeight ? { maxHeight: `${timelineMaxHeight}px` } : {}),
                                    marginTop: `${timelineListOffset}px`,
                                }}
                            >
                                {visibleTimeline.map((event, index) => (
                                    <li key={`${event.title}-${event.when}-${index}`} className={event.current ? 'is-current' : ''}>
                                        <p className="p-dashboard__timeline-time">{event.when}</p>
                                        <h4>{event.title}</h4>
                                        <p>{event.description}</p>
                                        {event.link && (
                                            <a className="p-dashboard__timeline-link" href={event.link} target="_blank" rel="noreferrer">
                                                Ir a la tarea
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

                            <div className="p-dashboard__timeline-actions" ref={timelineActionsRef}>
                                {canShowTimelineControls ? (
                                    <>
                                        {hasMoreTimelineItems && (
                                            <button
                                                className="p-dashboard__timeline-more"
                                                type="button"
                                                onClick={() => setVisibleTimelineItems((current) => current + TIMELINE_BATCH_SIZE)}
                                            >
                                                Mostrar mas
                                            </button>
                                        )}

                                        {canShowLessTimelineItems && (
                                            <button
                                                className="p-dashboard__timeline-less"
                                                type="button"
                                                onClick={() =>
                                                    setVisibleTimelineItems((current) => Math.max(TIMELINE_BATCH_SIZE, current - TIMELINE_BATCH_SIZE))
                                                }
                                            >
                                                Mostrar menos
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <Link className="p-dashboard__timeline-more p-dashboard__timeline-more--ghost" href="/asignaturas">
                                        Calendario completo
                                    </Link>
                                )}
                            </div>
                        </aside>
                    </section>
                </main>
            </article>
        </>
    );
}
