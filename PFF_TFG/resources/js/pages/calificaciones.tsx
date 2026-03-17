import { Head, Link } from '@inertiajs/react';
import { Bell, ChevronDown, ChevronUp, Search, Sparkles } from 'lucide-react';
import { useState } from 'react';

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
    const variants = buildVariantSequence(subjectCards.length);

    const toggleSubject = (id: number) => {
        setOpenSubjects((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    };

    return (
        <>
            <Head title="Calificaciones" />

            <article className="p-calificaciones">
                <header className="p-calificaciones__topbar">
                    <section className="p-calificaciones__container p-calificaciones__topbar-inner">
                        <section className="p-calificaciones__brand-wrap">
                            <section className="p-calificaciones__brand">
                                <span className="p-calificaciones__logo" aria-hidden="true">
                                    <Sparkles size={14} />
                                </span>
                                <strong>Academia</strong>
                            </section>

                            <nav className="p-calificaciones__nav" aria-label="Secciones principales">
                                <Link href="/dashboard">Dashboard</Link>
                                <Link href="/asignaturas">Asignaturas</Link>
                                <Link href="/calificaciones" className="is-active">Calificaciones</Link>
                            </nav>
                        </section>

                        <section className="p-calificaciones__toolbar" aria-label="Herramientas">
                            <label className="p-calificaciones__search">
                                <Search aria-hidden="true" />
                                <input type="search" placeholder="Buscar notas..." />
                            </label>
                            <button className="p-calificaciones__icon-btn" type="button" aria-label="Notificaciones">
                                <Bell size={16} />
                            </button>
                            <span className="p-calificaciones__avatar" aria-hidden="true">
                                {profileAvatarUrl && <img src={profileAvatarUrl} alt="Avatar Moodle" />}
                            </span>
                        </section>
                    </section>
                </header>

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
                                                                        <strong className={task.isNumeric ? 'p-calificaciones__grade--numeric' : 'p-calificaciones__grade--text'}>{task.grade}</strong>
                                                                    </section>
                                                                    {task.feedback && (
                                                                        <p className="p-calificaciones__feedback">{task.feedback}</p>
                                                                    )}
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
                </main>
            </article>
        </>
    );
}
