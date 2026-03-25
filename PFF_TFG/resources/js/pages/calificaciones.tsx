import { Head } from '@inertiajs/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import AcademiaHeader from '@/components/academia-header';
import FeedbackContent from '@/components/feedback-content';
import { formatFeedbackToBlocks } from '@/lib/feedback-parser';
import { toMoodleMediaUrl } from '@/lib/moodle-media';

type SubjectTask = {
    name: string;
    grade: string;
    isNumeric?: boolean;
    feedback?: string | null;
    url?: string | null;
    linkTitle?: boolean;
};

type SubjectUnit = {
    name: string;
    tasks: SubjectTask[];
};

type SubjectCard = {
    id: number;
    code: string;
    subject: string;
    teacher: string;
    image: string | null;
    gradedCount: number;
    units: SubjectUnit[];
    variant: 'large' | 'small' | 'wide' | 'compact' | 'accent';
    accent?: boolean;
};

type CalificacionesProps = {
    moodleConnected: boolean;
    studentName: string | null;
    profileAvatarUrl: string | null;
    subjectCards: SubjectCard[];
    summary: {
        subjects: number;
        gradedItems: number;
        subjectsWithGrades: number;
    };
    milestones: Array<{
        dateLabel: string;
        title: string;
        subject: string;
        link: string | null;
        kind: string;
    }>;
    pageError: string | null;
};

type FeedbackModalData = {
    subject: string;
    unit: string;
    task: string;
    feedback: string;
};

function parseNumericGrade(grade: string): number | null {
    const normalized = grade.replace(',', '.').trim();

    if (normalized === '' || normalized === '-') {
        return null;
    }

    const ratioMatch = normalized.match(/([0-9]+(?:\.[0-9]+)?)\s*\/\s*([0-9]+(?:\.[0-9]+)?)/);

    if (ratioMatch) {
        const value = Number.parseFloat(ratioMatch[1]);
        const base = Number.parseFloat(ratioMatch[2]);

        if (Number.isNaN(value) || Number.isNaN(base) || base <= 0) {
            return null;
        }

        // Some sources may fallback to x/10 while x is actually a percentage.
        if (base === 10 && value > 10 && value <= 100) {
            return value / 10;
        }

        return (value / base) * 10;
    }

    const textualScaleMatch = normalized.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:de|sobre|out\s+of)\s*([0-9]+(?:\.[0-9]+)?)/i);

    if (textualScaleMatch) {
        const value = Number.parseFloat(textualScaleMatch[1]);
        const base = Number.parseFloat(textualScaleMatch[2]);

        if (Number.isNaN(value) || Number.isNaN(base) || base <= 0) {
            return null;
        }

        return (value / base) * 10;
    }

    const percentMatch = normalized.match(/([0-9]+(?:\.[0-9]+)?)\s*%/);

    if (percentMatch) {
        const value = Number.parseFloat(percentMatch[1]);

        if (Number.isNaN(value)) {
            return null;
        }

        return value / 10;
    }

    const plainMatch = normalized.match(/^([0-9]+(?:\.[0-9]+)?)$/);

    if (plainMatch) {
        const value = Number.parseFloat(plainMatch[1]);

        if (Number.isNaN(value)) {
            return null;
        }

        // Handle percentage-like grades where Moodle returns 0-100 without denominator.
        if (value > 10 && value <= 100) {
            return value / 10;
        }

        return value;
    }

    return null;
}

function formatOneDecimal(value: number): string {
    return value.toFixed(1);
}

function buildBackgroundImageStyle(imageUrl: string | null): { backgroundImage: string } | undefined {
    const resolvedImageUrl = toMoodleMediaUrl(imageUrl);

    if (! resolvedImageUrl) {
        return undefined;
    }

    const sanitized = resolvedImageUrl.replace(/"/g, '\\"');

    return {
        backgroundImage: `url("${sanitized}")`,
    };
}

export default function Calificaciones({ moodleConnected, studentName, profileAvatarUrl, subjectCards, summary, milestones, pageError }: CalificacionesProps) {
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(subjectCards[0]?.id ?? null);
    const [isFeaturedExpanded, setIsFeaturedExpanded] = useState(false);
    const [visibleSideSubjectsCount, setVisibleSideSubjectsCount] = useState(3);
    const [selectedFeedback, setSelectedFeedback] = useState<FeedbackModalData | null>(null);

    const formattedFeedbackBlocks = useMemo(
        () => (selectedFeedback ? formatFeedbackToBlocks(selectedFeedback.feedback) : []),
        [selectedFeedback],
    );

    const featuredSubject = useMemo(() => {
        if (selectedSubjectId === null) {
            return subjectCards[0] ?? null;
        }

        return subjectCards.find((subject) => subject.id === selectedSubjectId) ?? subjectCards[0] ?? null;
    }, [selectedSubjectId, subjectCards]);

    const sideSubjects = useMemo(
        () => subjectCards.filter((subject) => featuredSubject === null || subject.id !== featuredSubject.id),
        [featuredSubject, subjectCards],
    );

    const globalAverage = useMemo(() => {
        const grades = subjectCards
            .flatMap((subject) => subject.units.flatMap((unit) => unit.tasks.map((task) => parseNumericGrade(task.grade))))
            .filter((grade): grade is number => grade !== null);

        if (grades.length === 0) {
            return null;
        }

        const average = grades.reduce((acc, grade) => acc + grade, 0) / grades.length;

        return Number.parseFloat(formatOneDecimal(average));
    }, [subjectCards]);

    const subjectAverages = useMemo(() => {
        return subjectCards.map((subject) => {
            const subjectGrades = subject.units
                .flatMap((unit) => unit.tasks.map((task) => parseNumericGrade(task.grade)))
                .filter((grade): grade is number => grade !== null);

            if (subjectGrades.length === 0) {
                return {
                    id: subject.id,
                    average: null,
                    isGraded: false,
                };
            }

            return {
                id: subject.id,
                average: subjectGrades.reduce((acc, grade) => acc + grade, 0) / subjectGrades.length,
                isGraded: true,
            };
        });
    }, [subjectCards]);

    const gradedSubjects = subjectAverages.filter((subject) => subject.isGraded).length;
    const approvedSubjects = subjectAverages.filter((subject) => subject.average !== null && subject.average >= 5).length;

    const totalSubjects = summary.subjects;
    const approvedProgress = gradedSubjects > 0 ? Math.round((approvedSubjects / gradedSubjects) * 100) : 0;
    const ungradedSubjects = Math.max(totalSubjects - gradedSubjects, 0);

    const sideSubjectsVisible = sideSubjects.slice(0, visibleSideSubjectsCount);
    const canShowMoreSideSubjects = sideSubjectsVisible.length < sideSubjects.length;
    const canShowLessSideSubjects = visibleSideSubjectsCount > 3;

    const featuredTasks = featuredSubject?.units.flatMap((unit) => unit.tasks) ?? [];
    const featuredScore =
        featuredTasks
            .map((task) => parseNumericGrade(task.grade))
            .filter((grade): grade is number => grade !== null)
            .reduce((acc, grade, _, list) => acc + grade / list.length, 0) ?? null;

    const handleSelectSubject = (id: number) => {
        setSelectedSubjectId(id);
        setIsFeaturedExpanded(false);
    };

    return (
        <>
            <Head title="Calificaciones" />

            <article className="p-calificaciones">
                <AcademiaHeader
                    containerClassName="p-calificaciones__container"
                    activePath="/calificaciones"
                    profileAvatarUrl={profileAvatarUrl}
                    studentName={studentName}
                />

                <main className="p-calificaciones__container p-calificaciones__main">
                    <header className="p-calificaciones__head">
                        <section>
                            <h1>
                                CALIFICACIONES
                                <span>.</span>
                            </h1>
                        </section>
                        <p>{moodleConnected ? 'Datos sincronizados desde Moodle' : 'Conecta Moodle para ver tus calificaciones'}</p>
                    </header>

                    {pageError && <p className="p-calificaciones__error">{pageError}</p>}

                    <section className="p-calificaciones__summary c-stats-strip c-stats-strip--3" aria-label="Resumen de calificaciones">
                        <article className="p-calificaciones__metric">
                            <small>PROMEDIO GLOBAL</small>
                            <strong className="p-calificaciones__metric-highlight">
                                {globalAverage === null ? '--' : formatOneDecimal(globalAverage)}
                            </strong>
                            <p>{globalAverage !== null && globalAverage >= 8 ? 'Top de rendimiento' : 'Rendimiento en progreso'}</p>
                        </article>
                        <article className="p-calificaciones__metric">
                            <small>MATERIAS APROBADAS</small>
                            <strong>
                                {approvedSubjects.toString().padStart(2, '0')}/{Math.max(gradedSubjects, 0).toString().padStart(2, '0')}
                            </strong>
                            <section className="p-calificaciones__progress" aria-hidden="true">
                                <span style={{ width: `${approvedProgress}%` }} />
                            </section>
                        </article>
                        <article className="p-calificaciones__metric">
                            <small>MATERIAS CALIFICADAS</small>
                            <strong>{gradedSubjects.toString().padStart(2, '0')}</strong>
                            <p>{ungradedSubjects} sin calificar</p>
                        </article>
                    </section>

                    {subjectCards.length > 0 && featuredSubject && (
                        <section className="p-calificaciones__workspace">
                            <article className="p-calificaciones__featured">
                                <button
                                    className="p-calificaciones__featured-trigger"
                                    type="button"
                                    onClick={() => setIsFeaturedExpanded((prev) => ! prev)}
                                    aria-expanded={isFeaturedExpanded}
                                    style={buildBackgroundImageStyle(featuredSubject.image)}
                                >
                                    <header className="p-calificaciones__featured-head">
                                        <section>
                                            <small>{featuredSubject.code}</small>
                                            <span>ACTIVA</span>
                                        </section>
                                        <section className="p-calificaciones__featured-score">
                                            <small>NOTA FINAL ESTIMADA</small>
                                            <strong>{featuredScore === null ? '-' : formatOneDecimal(featuredScore)}</strong>
                                        </section>
                                    </header>

                                    <h2>{featuredSubject.subject}</h2>

                                    <section className="p-calificaciones__featured-preview" aria-hidden="true">
                                        {(featuredTasks.length > 0 ? featuredTasks : [{ name: 'Sin tareas calificadas', grade: '-', isNumeric: false }]).slice(0, 3).map((task) => (
                                            <article key={`${featuredSubject.id}-${task.name}`}>
                                                <p>{task.name}</p>
                                                <strong>{task.grade}</strong>
                                                <span />
                                            </article>
                                        ))}
                                    </section>

                                    <footer className="p-calificaciones__featured-footer">
                                        <p>{featuredSubject.teacher}</p>
                                        <span>
                                            {isFeaturedExpanded ? 'Ocultar detalle' : 'Ver detalle completo'}
                                            {isFeaturedExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </span>
                                    </footer>
                                </button>

                                {isFeaturedExpanded && (
                                    <section className="p-calificaciones__details" aria-label={`Detalle ${featuredSubject.subject}`}>
                                        {featuredSubject.units.length > 0 ? (
                                            featuredSubject.units.map((unit) => (
                                                <section className="p-calificaciones__unit" key={unit.name}>
                                                    <h4>{unit.name}</h4>
                                                    <ul>
                                                        {unit.tasks.map((task) => (
                                                            <li key={`${unit.name}-${task.name}`}>
                                                                <section className="p-calificaciones__task-row">
                                                                    {task.linkTitle && task.url ? (
                                                                        <a className="p-calificaciones__task-name" href={task.url} target="_blank" rel="noreferrer">
                                                                            {task.name}
                                                                        </a>
                                                                    ) : (
                                                                        <span className="p-calificaciones__task-name">{task.name}</span>
                                                                    )}
                                                                    {task.feedback && (
                                                                        <button
                                                                            className="p-calificaciones__feedback-btn"
                                                                            type="button"
                                                                            onClick={() =>
                                                                                setSelectedFeedback({
                                                                                    subject: featuredSubject.subject,
                                                                                    unit: unit.name,
                                                                                    task: task.name,
                                                                                    feedback: task.feedback as string,
                                                                                })
                                                                            }
                                                                        >
                                                                            Ver retroalimentacion
                                                                        </button>
                                                                    )}
                                                                    <strong className={task.isNumeric ? 'p-calificaciones__grade--numeric' : 'p-calificaciones__grade--text'}>{task.grade}</strong>
                                                                </section>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </section>
                                            ))
                                        ) : (
                                            <p className="p-calificaciones__no-grades">Sin tareas calificadas en esta asignatura.</p>
                                        )}
                                    </section>
                                )}
                            </article>

                            <aside className="p-calificaciones__subject-menu" aria-label="Listado de asignaturas">
                                {sideSubjectsVisible.map((card) => {
                                    const score = subjectAverages.find((subject) => subject.id === card.id)?.average ?? null;

                                    return (
                                        <button key={card.id} type="button" className="p-calificaciones__subject-item" onClick={() => handleSelectSubject(card.id)}>
                                            <section>
                                                <small>{card.code}</small>
                                                <h3>{card.subject}</h3>
                                                <p>{card.gradedCount > 0 ? `${card.gradedCount} tareas calificadas` : 'Sin calificaciones aun'}</p>
                                            </section>
                                            <strong>{score !== null ? formatOneDecimal(score) : '-'}</strong>
                                        </button>
                                    );
                                })}

                                {(canShowMoreSideSubjects || canShowLessSideSubjects) && (
                                    <section className="p-calificaciones__subject-menu-actions">
                                        {canShowMoreSideSubjects && (
                                            <button
                                                type="button"
                                                className={`p-calificaciones__subject-menu-toggle ${canShowLessSideSubjects ? 'p-calificaciones__subject-menu-toggle--with-less' : ''}`}
                                                onClick={() =>
                                                    setVisibleSideSubjectsCount((prev) => Math.min(prev + 3, sideSubjects.length))
                                                }
                                            >
                                                Ver mas asignaturas
                                            </button>
                                        )}

                                        {canShowLessSideSubjects && (
                                            <button
                                                type="button"
                                                className="p-calificaciones__subject-menu-toggle p-calificaciones__subject-menu-toggle--secondary"
                                                onClick={() => setVisibleSideSubjectsCount((prev) => Math.max(3, prev - 3))}
                                            >
                                                Ver menos
                                            </button>
                                        )}
                                    </section>
                                )}
                            </aside>
                        </section>
                    )}

                    {subjectCards.length === 0 && (
                        <article className="p-calificaciones__empty">
                            <h3>Sin calificaciones disponibles</h3>
                            <p>
                                {moodleConnected
                                    ? 'No se encontraron registros de calificaciones para esta cuenta.'
                                    : 'Conecta Moodle para cargar tus calificaciones.'}
                            </p>
                        </article>
                    )}

                    <section className="p-calificaciones__milestones" aria-label="Proximos hitos">
                        <h2>PROXIMOS HITOS</h2>
                        <section>
                            {milestones.map((milestone) => (
                                <article key={`${milestone.dateLabel}-${milestone.title}-${milestone.subject}`}>
                                    <small>{milestone.dateLabel}</small>
                                    {milestone.link ? (
                                        <a href={milestone.link} target="_blank" rel="noreferrer">
                                            {milestone.title}
                                        </a>
                                    ) : (
                                        <p>{milestone.title}</p>
                                    )}
                                    <span>{milestone.subject}</span>
                                </article>
                            ))}

                            {milestones.length === 0 && (
                                <article>
                                    <small>SIN DATOS</small>
                                    <p>
                                        {moodleConnected
                                            ? 'No hay entregas recientes ni proximas para mostrar.'
                                            : 'Conecta Moodle para mostrar hitos reales de tus tareas.'}
                                    </p>
                                </article>
                            )}
                        </section>
                    </section>

                    {selectedFeedback && (
                        <section className="p-calificaciones__feedback-modal-wrapper" role="dialog" aria-modal="true" aria-labelledby="feedback-modal-title">
                            <button
                                type="button"
                                className="p-calificaciones__feedback-modal-backdrop"
                                onClick={() => setSelectedFeedback(null)}
                                aria-label="Cerrar modal de retroalimentacion"
                            />
                            <article className="p-calificaciones__feedback-modal">
                                <header className="p-calificaciones__feedback-modal-header">
                                    <section>
                                        <h3 id="feedback-modal-title">{selectedFeedback.task}</h3>
                                        <p>{selectedFeedback.subject} · {selectedFeedback.unit}</p>
                                    </section>
                                    <button
                                        type="button"
                                        className="p-calificaciones__feedback-modal-close"
                                        onClick={() => setSelectedFeedback(null)}
                                    >
                                        Cerrar
                                    </button>
                                </header>
                                <section className="p-calificaciones__feedback-content">
                                    <FeedbackContent blocks={formattedFeedbackBlocks} />
                                </section>
                            </article>
                        </section>
                    )}
                </main>
            </article>
        </>
    );
}
