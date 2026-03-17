import { Head, Link } from '@inertiajs/react';
import { Bell, Search, Sparkles } from 'lucide-react';

type GradeCard = {
    subject: string;
    average: number;
    progress: number;
    itemsCount: number;
    status: string;
};

type CalificacionesProps = {
    moodleConnected: boolean;
    profileAvatarUrl: string | null;
    gradeCards: GradeCard[];
    summary: {
        subjects: number;
        average: number;
        passed: number;
        pending: number;
    };
    pageError: string | null;
};

export default function Calificaciones({ moodleConnected, profileAvatarUrl, gradeCards, summary, pageError }: CalificacionesProps) {
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
                            <strong>{summary.average}</strong>
                            <small>MEDIA</small>
                        </article>
                        <article>
                            <strong>{summary.passed}</strong>
                            <small>APROBADAS</small>
                        </article>
                        <article>
                            <strong>{summary.pending}</strong>
                            <small>PENDIENTES</small>
                        </article>
                    </section>

                    <section className="p-calificaciones__grid">
                        {gradeCards.map((card) => (
                            <article key={card.subject} className={`p-calificaciones__card ${card.progress >= 70 ? 'is-pass' : ''}`}>
                                <header>
                                    <small>{card.status}</small>
                                    <span>{card.itemsCount} items</span>
                                </header>
                                <h3>{card.subject}</h3>
                                <footer>
                                    <section>
                                        <small>Nota media</small>
                                        <strong>{card.average}</strong>
                                    </section>
                                    <section>
                                        <small>Progreso</small>
                                        <strong>{card.progress}%</strong>
                                    </section>
                                </footer>
                            </article>
                        ))}

                        {gradeCards.length === 0 && (
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
