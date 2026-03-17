import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Bell, BookOpenText, Search, Sparkles } from 'lucide-react';

type CourseCard = {
    id: number;
    code: string;
    title: string;
    meta: string;
    teacher: string;
    progress: number;
    tasksTotal: number;
    tasksPending: number;
    variant: 'featured' | 'tall' | 'wide' | 'compact' | 'accent';
};

type AsignaturasProps = {
    moodleConnected: boolean;
    courseCards: CourseCard[];
    summary: {
        courses: number;
        averageProgress: number;
        highProgress: number;
        pendingTasks: number;
    };
    profileAvatarUrl: string | null;
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

        if (!hasSecond) {
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

export default function Asignaturas({ moodleConnected, courseCards, summary, profileAvatarUrl, pageError }: AsignaturasProps) {
    const variantSequence = buildVariantSequence(courseCards.length);
    const isDiagonalAccent = (index: number): boolean => {
        const pair = Math.floor(index / 2);
        const positionInPair = index % 2;

        if (pair % 2 === 0) {
            return positionInPair === 1;
        }

        return positionInPair === 0;
    };

    return (
        <>
            <Head title="Asignaturas" />

            <article className="p-asignaturas">
                <header className="p-asignaturas__topbar">
                    <section className="p-asignaturas__container p-asignaturas__topbar-inner">
                        <section className="p-asignaturas__brand-wrap">
                            <section className="p-asignaturas__brand">
                                <span className="p-asignaturas__logo" aria-hidden="true">
                                    <Sparkles size={14} />
                                </span>
                                <strong>Academia</strong>
                            </section>

                            <nav className="p-asignaturas__nav" aria-label="Secciones principales">
                                <Link href="/dashboard">Inicio</Link>
                                <Link href="/asignaturas" className="is-active">
                                    Asignaturas
                                </Link>
                                <Link href="/calificaciones">Calificaciones</Link>
                            </nav>
                        </section>

                        <section className="p-asignaturas__toolbar" aria-label="Herramientas">
                            <label className="p-asignaturas__search">
                                <Search aria-hidden="true" />
                                <input type="search" placeholder="BUSCAR RECURSOS" />
                            </label>
                            <button className="p-asignaturas__icon-btn" type="button" aria-label="Notificaciones">
                                <Bell size={16} />
                            </button>
                            <span className="p-asignaturas__avatar" aria-hidden="true">
                                {profileAvatarUrl && <img src={profileAvatarUrl} alt="Avatar Moodle" />}
                            </span>
                        </section>
                    </section>
                </header>

                <main className="p-asignaturas__container p-asignaturas__main">
                    <header className="p-asignaturas__hero-head">
                        <section>
                            <small>Portfolio Academico</small>
                            <h1>
                                ASIGNATURAS
                                <span>.</span>
                            </h1>
                        </section>
                        <section className="p-asignaturas__period">
                            <p>Semestre actual</p>
                            <small>{moodleConnected ? 'Sincronizado con Moodle' : 'Conecta Moodle para sincronizar'}</small>
                        </section>
                    </header>

                    {pageError && <p className="p-asignaturas__error">{pageError}</p>}

                    <section className="p-asignaturas__grid">
                        {courseCards.map((course, index) => {
                            const variant = variantSequence[index] ?? 'small';

                            return (
                            <article key={course.id} className={`p-asignaturas__course p-asignaturas__course--${variant} ${isDiagonalAccent(index) ? 'p-asignaturas__course--accent' : ''}`}>
                                <header>
                                    <BookOpenText size={16} />
                                    <small>{course.code}</small>
                                </header>

                                <h3>{course.title}</h3>
                                <p>{course.meta}</p>
                                <span className="p-asignaturas__teacher">{course.teacher}</span>
                                <span className="p-asignaturas__tasks">
                                    Tareas: {course.tasksTotal} · Pendientes: {course.tasksPending}
                                </span>

                                <footer>
                                    <section className="p-asignaturas__progress">
                                        <strong>{course.progress}%</strong>
                                        <span>
                                            <i style={{ width: `${course.progress}%` }} />
                                        </span>
                                    </section>
                                    <button type="button" aria-label={`Abrir ${course.title}`}>
                                        <ArrowRight size={14} />
                                    </button>
                                </footer>

                                <em className="p-asignaturas__index">{String(index + 1).padStart(2, '0')}</em>
                            </article>
                            );
                        })}

                        {courseCards.length === 0 && (
                            <article className="p-asignaturas__empty">
                                <h3>Sin asignaturas disponibles</h3>
                                <p>
                                    {moodleConnected
                                        ? 'No se encontraron asignaturas en Moodle para esta cuenta.'
                                        : 'Conecta Moodle para cargar todas tus asignaturas.'}
                                </p>
                            </article>
                        )}
                    </section>

                    <section className="p-asignaturas__summary" aria-label="Resumen academico">
                        <article>
                            <strong>{summary.courses}</strong>
                            <small>ASIGNATURAS</small>
                        </article>
                        <article>
                            <strong>{summary.averageProgress}%</strong>
                            <small>PROGRESO MEDIO</small>
                        </article>
                        <article>
                            <strong>{summary.highProgress}</strong>
                            <small>ASIGNATURAS &gt;= 75%</small>
                        </article>
                        <article>
                            <strong>{summary.pendingTasks}</strong>
                            <small>TAREAS PENDIENTES</small>
                        </article>
                    </section>
                </main>
            </article>
        </>
    );
}
