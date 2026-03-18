import { Head } from '@inertiajs/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import AcademiaHeader from '@/components/academia-header';

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
    profileAvatarUrl: string | null;
    subjectCards: SubjectCard[];
    summary: {
        subjects: number;
        gradedItems: number;
        subjectsWithGrades: number;
    };
    pageError: string | null;
};

type FeedbackModalData = {
    subject: string;
    unit: string;
    task: string;
    feedback: string;
};

function buildVariantSequence(total: number): Array<'large' | 'small' | 'full'> {
    if (total <= 0) {
        return [];
    }

    const variants: Array<'large' | 'small' | 'full'> = [];

    for (let i = 0; i < total; i += 2) {
        const pair = Math.floor(i / 2);
        const isEvenPair = pair % 2 === 0;
        const hasSecond = i + 1 < total;

        if (! hasSecond) {
            variants.push('full');
            break;
        }

        if (isEvenPair) {
            variants.push('large', 'small');
        } else {
            variants.push('small', 'large');
        }
    }

    return variants;
}

export default function Calificaciones({ moodleConnected, profileAvatarUrl, subjectCards, summary, pageError }: CalificacionesProps) {
    const [openSubjects, setOpenSubjects] = useState<number[]>([]);
    const [selectedFeedback, setSelectedFeedback] = useState<FeedbackModalData | null>(null);
    const variants = buildVariantSequence(subjectCards.length);

    const toggleSubject = (id: number) => {
        setOpenSubjects((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    };

    return (
        <>
            <Head title="Calificaciones" />

            <article className="p-calificaciones">
                <AcademiaHeader
                    containerClassName="p-calificaciones__container"
                    activePath="/calificaciones"
                    profileAvatarUrl={profileAvatarUrl}
                    searchPlaceholder="Buscar notas..."
                />

                <main className="p-calificaciones__container p-calificaciones__main">
                    <header className="p-calificaciones__head">
                        <section>
                            <small>Rendimiento academico</small>
                            <h1>CALIFICACIONES</h1>
                        </section>
                        <p>{moodleConnected ? 'Datos sincronizados desde Moodle' : 'Conecta Moodle para ver tus calificaciones'}</p>
                    </header>

                    {pageError && <p className="p-calificaciones__error">{pageError}</p>}

                    <section className="p-calificaciones__summary" aria-label="Resumen de calificaciones">
                        <article>
                            <strong>{summary.subjects}</strong>
                            <small>ASIGNATURAS</small>
                        </article>
                        <article>
                            <strong>{summary.gradedItems}</strong>
                            <small>TAREAS CALIFICADAS</small>
                        </article>
                        <article>
                            <strong>{summary.subjectsWithGrades}</strong>
                            <small>ASIGNATURAS CON NOTAS</small>
                        </article>
                    </section>

                    <section className="p-calificaciones__grid">
                        {subjectCards.map((card, index) => {
                            const isOpen = openSubjects.includes(card.id);
                            const variant = variants[index] ?? 'small';

                            return (
                                <article
                                    key={card.id}
                                    className={`p-calificaciones__card p-calificaciones__card--${variant} ${card.accent ? 'is-accent' : ''} ${isOpen ? 'is-open' : ''}`}
                                >
                                    <button
                                        className="p-calificaciones__trigger"
                                        type="button"
                                        onClick={() => toggleSubject(card.id)}
                                        aria-expanded={isOpen}
                                        style={card.image ? { backgroundImage: `url(${card.image})` } : undefined}
                                    >
                                        <header>
                                            <small>{card.code}</small>
                                            <span>{card.gradedCount} calificaciones</span>
                                        </header>

                                        <h3>{card.subject}</h3>
                                        <p>{card.teacher}</p>

                                        <footer>
                                            <strong>{card.gradedCount}</strong>
                                            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </footer>
                                    </button>

                                    {isOpen && (
                                        <section className="p-calificaciones__details" aria-label={`Detalle ${card.subject}`}>
                                            {card.units.length > 0 ? (
                                                card.units.map((unit) => (
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
                                                                                        subject: card.subject,
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
                            );
                        })}

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
                                    <p>{selectedFeedback.feedback}</p>
                                </section>
                            </article>
                        </section>
                    )}
                </main>
            </article>
        </>
    );
}
