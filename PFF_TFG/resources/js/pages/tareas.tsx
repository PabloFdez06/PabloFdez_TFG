import { Head } from '@inertiajs/react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import AcademiaHeader from '@/components/academia-header';

type TaskItem = {
    id: string;
    name: string;
    courseName: string;
    unitName: string;
    statusKey: 'pending' | 'delivered' | 'graded' | 'expired';
    statusLabel: string;
    statusTone: 'pending' | 'critical' | 'delivered' | 'expired' | 'graded';
    dueLabel: string;
    url: string | null;
};

type SubjectUnit = {
    name: string;
    tasks: TaskItem[];
};

type SubjectCard = {
    id: number;
    code: string;
    subject: string;
    teacher: string;
    image: string | null;
    totalTasks: number;
    pendingTasks: number;
    upcomingTasks: number;
    completionRate: number;
    units: SubjectUnit[];
};

type TareasProps = {
    moodleConnected: boolean;
    studentName: string | null;
    profileAvatarUrl: string | null;
    subjectCards: SubjectCard[];
    tasksByDate: Record<string, TaskItem[]>;
    summary: {
        pending: number;
        upcoming: number;
        complianceRate: number;
    };
    initialSubjectId: number | null;
    calendar: {
        initialMonth: string;
        selectedDate: string;
    };
    pageError: string | null;
};

type CalendarCell = {
    iso: string;
    day: number;
    isCurrentMonth: boolean;
    markerTone: 'pending' | 'critical' | 'delivered' | 'expired' | 'graded' | null;
    taskCount: number;
};

const SUBJECT_BATCH_SIZE = 4;
const TASK_BATCH_SIZE = 5;
const INITIAL_VISIBLE_SUBJECTS = 2;

function parseIsoDate(value: string): Date {
    return new Date(`${value}T00:00:00`);
}

function formatMonthLabel(date: Date): string {
    return date.toLocaleDateString('es-ES', {
        month: 'long',
        year: 'numeric',
    }).toUpperCase();
}

function buildMonthDate(monthValue: string): Date {
    const [year, month] = monthValue.split('-').map((part) => Number.parseInt(part, 10));

    return new Date(year, (month || 1) - 1, 1);
}

function monthToKey(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');

    return `${year}-${month}`;
}

function shiftMonth(base: Date, delta: number): Date {
    return new Date(base.getFullYear(), base.getMonth() + delta, 1);
}

function getMondayFirstDay(date: Date): number {
    const weekDay = date.getDay();

    return weekDay === 0 ? 6 : weekDay - 1;
}

function buildCalendarCells(monthDate: Date, tasksByDate: Record<string, TaskItem[]>): CalendarCell[] {
    const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const daysToSubtract = getMondayFirstDay(firstOfMonth);
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() - daysToSubtract);

    const cells: CalendarCell[] = [];

    for (let index = 0; index < 42; index += 1) {
        const current = new Date(gridStart);
        current.setDate(gridStart.getDate() + index);

        const iso = current.toISOString().slice(0, 10);
        const dayTasks = tasksByDate[iso] ?? [];

        let markerTone: CalendarCell['markerTone'] = null;

        if (dayTasks.some((task) => task.statusTone === 'expired')) {
            markerTone = 'expired';
        } else if (dayTasks.some((task) => task.statusTone === 'critical')) {
            markerTone = 'critical';
        } else if (dayTasks.some((task) => task.statusTone === 'pending')) {
            markerTone = 'pending';
        } else if (dayTasks.some((task) => task.statusTone === 'graded')) {
            markerTone = 'graded';
        } else if (dayTasks.length > 0) {
            markerTone = 'delivered';
        }

        cells.push({
            iso,
            day: current.getDate(),
            isCurrentMonth: current.getMonth() === monthDate.getMonth(),
            markerTone,
            taskCount: dayTasks.length,
        });
    }

    return cells;
}

function pickMonthDateSelection(monthDate: Date, tasksByDate: Record<string, TaskItem[]>): string {
    const monthKey = monthToKey(monthDate);
    const dayWithTasks = Object.keys(tasksByDate)
        .filter((dateKey) => dateKey.startsWith(monthKey))
        .sort()[0];

    if (dayWithTasks) {
        return dayWithTasks;
    }

    const fallback = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);

    return fallback.toISOString().slice(0, 10);
}

function flattenSubjectTasks(subject: SubjectCard | null): TaskItem[] {
    if (!subject) {
        return [];
    }

    return subject.units.flatMap((unit) => unit.tasks.map((task) => ({ ...task, unitName: unit.name })));
}

function buildBadgeClass(statusKey: TaskItem['statusKey'], statusTone: TaskItem['statusTone']): string {
    if (statusKey === 'expired' || statusTone === 'expired') {
        return 'is-expired';
    }

    if (statusKey === 'graded') {
        return 'is-graded';
    }

    if (statusKey === 'delivered') {
        return 'is-delivered';
    }

    if (statusTone === 'critical') {
        return 'is-critical';
    }

    return 'is-pending';
}

export default function Tareas({
    moodleConnected,
    studentName,
    profileAvatarUrl,
    subjectCards,
    tasksByDate,
    summary,
    initialSubjectId,
    calendar,
    pageError,
}: TareasProps) {
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(initialSubjectId ?? subjectCards[0]?.id ?? null);
    const [selectedDate, setSelectedDate] = useState<string>(calendar.selectedDate);
    const [calendarMonth, setCalendarMonth] = useState<Date>(buildMonthDate(calendar.initialMonth));
    const [visibleSubjectCount, setVisibleSubjectCount] = useState<number>(INITIAL_VISIBLE_SUBJECTS);
    const [visibleTaskCountBySubject, setVisibleTaskCountBySubject] = useState<Record<number, number>>(() =>
        subjectCards.reduce<Record<number, number>>((acc, subject) => {
            acc[subject.id] = TASK_BATCH_SIZE;

            return acc;
        }, {}),
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

    const minimumVisibleSubjects = Math.min(INITIAL_VISIBLE_SUBJECTS, sideSubjects.length);
    const visibleSideSubjects = sideSubjects.slice(0, visibleSubjectCount);
    const canLoadMoreSubjects = visibleSideSubjects.length < sideSubjects.length;
    const canLoadLessSubjects = visibleSideSubjects.length > minimumVisibleSubjects;

    const featuredTasks = useMemo(() => flattenSubjectTasks(featuredSubject), [featuredSubject]);

    const visibleTaskCount = featuredSubject ? (visibleTaskCountBySubject[featuredSubject.id] ?? TASK_BATCH_SIZE) : TASK_BATCH_SIZE;
    const visibleTasks = featuredTasks.slice(0, visibleTaskCount);
    const canLoadMoreTasks = featuredTasks.length > visibleTaskCount;
    const canLoadLessTasks = visibleTaskCount > TASK_BATCH_SIZE;

    const calendarCells = useMemo(() => buildCalendarCells(calendarMonth, tasksByDate), [calendarMonth, tasksByDate]);

    const dayAgenda = tasksByDate[selectedDate] ?? [];
    const selectedDateObject = parseIsoDate(selectedDate);

    const selectedDateDay = selectedDateObject.toLocaleDateString('es-ES', { day: '2-digit' });
    const selectedDateWeekday = selectedDateObject.toLocaleDateString('es-ES', { weekday: 'long' }).toUpperCase();

    const handleChangeMonth = (delta: number) => {
        const nextMonth = shiftMonth(calendarMonth, delta);
        setCalendarMonth(nextMonth);
        setSelectedDate(pickMonthDateSelection(nextMonth, tasksByDate));
    };

    const handleGoToCurrentMonth = () => {
        const currentMonth = new Date();
        setCalendarMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
        setSelectedDate(pickMonthDateSelection(currentMonth, tasksByDate));
    };

    const handleSelectSubject = (subjectId: number) => {
        setSelectedSubjectId(subjectId);
        setVisibleTaskCountBySubject((previous) => ({
            ...previous,
            [subjectId]: previous[subjectId] ?? TASK_BATCH_SIZE,
        }));
    };

    const handleLoadMoreTasks = () => {
        if (!featuredSubject) {
            return;
        }

        setVisibleTaskCountBySubject((previous) => ({
            ...previous,
            [featuredSubject.id]: (previous[featuredSubject.id] ?? TASK_BATCH_SIZE) + TASK_BATCH_SIZE,
        }));
    };

    const handleLoadLessTasks = () => {
        if (!featuredSubject) {
            return;
        }

        setVisibleTaskCountBySubject((previous) => ({
            ...previous,
            [featuredSubject.id]: Math.max(TASK_BATCH_SIZE, (previous[featuredSubject.id] ?? TASK_BATCH_SIZE) - TASK_BATCH_SIZE),
        }));
    };

    return (
        <>
            <Head title="Tareas" />

            <article className="p-tareas">
                <AcademiaHeader
                    containerClassName="p-tareas__container"
                    activePath="/tareas"
                    profileAvatarUrl={profileAvatarUrl}
                    studentName={studentName}
                />

                <main className="p-tareas__container p-tareas__main">
                    <header className="p-tareas__head">
                        <section>
                            <h1>
                                GESTION DE TAREAS
                                <span>.</span>
                            </h1>
                        </section>

                        <section className="p-tareas__summary c-stats-strip c-stats-strip--3" aria-label="Resumen de tareas">
                            <article className="p-tareas__metric">
                                <strong>{summary.pending.toString().padStart(2, '0')}</strong>
                                <small>PENDIENTES</small>
                            </article>
                            <article className="p-tareas__metric">
                                <strong>{summary.upcoming.toString().padStart(2, '0')}</strong>
                                <small>PROXIMAS</small>
                            </article>
                            <article className="p-tareas__metric">
                                <strong>{summary.complianceRate}%</strong>
                                <small>CUMPLIMIENTO</small>
                            </article>
                        </section>
                    </header>

                    {pageError && <p className="p-tareas__error">{pageError}</p>}

                    {featuredSubject ? (
                        <section className="p-tareas__workspace">
                            <section className="p-tareas__subjects-column" aria-label="Asignatura activa y asignaturas disponibles">
                                <article className="p-tareas__featured">
                                    <header className="p-tareas__featured-hero">
                                        <section className="p-tareas__featured-content">
                                            <small>{featuredSubject.code}</small>
                                            <h2>{featuredSubject.subject}</h2>
                                        </section>
                                    </header>

                                    <section className="p-tareas__table" aria-label={`Tareas de ${featuredSubject.subject}`}>
                                        <header className="p-tareas__table-head">
                                            <p>TAREA</p>
                                            <p>FECHA ENTREGA</p>
                                            <p>ESTADO</p>
                                            <p aria-hidden="true" />
                                        </header>

                                        <section className="p-tareas__table-body">
                                            {visibleTasks.length > 0 ? (
                                                <ul>
                                                    {visibleTasks.map((task, index) => {
                                                        const previousTask = index > 0 ? visibleTasks[index - 1] : null;
                                                        const showUnitSeparator = previousTask === null || previousTask.unitName !== task.unitName;

                                                        return (
                                                            <Fragment key={task.id}>
                                                                {showUnitSeparator && (
                                                                    <li className="p-tareas__unit-separator" aria-label={`Unidad ${task.unitName}`}>
                                                                        <span>{task.unitName}</span>
                                                                    </li>
                                                                )}
                                                                <li>
                                                                    <article className="p-tareas__task-row">
                                                                        <section className="p-tareas__task-main">
                                                                            <h3>{task.name}</h3>
                                                                            <p>Modulo: {task.unitName}</p>
                                                                        </section>

                                                                        <p className="p-tareas__task-date">{task.dueLabel}</p>

                                                                        <p className={`p-tareas__task-status ${buildBadgeClass(task.statusKey, task.statusTone)}`}>
                                                                            {task.statusLabel}
                                                                        </p>

                                                                        {task.url ? (
                                                                            <a href={task.url} target="_blank" rel="noreferrer" aria-label={`Abrir ${task.name} en Moodle`}>
                                                                                <ArrowRight size={16} />
                                                                            </a>
                                                                        ) : (
                                                                            <span className="p-tareas__task-link-disabled" aria-hidden="true">
                                                                                <ArrowRight size={16} />
                                                                            </span>
                                                                        )}
                                                                    </article>
                                                                </li>
                                                            </Fragment>
                                                        );
                                                    })}
                                                </ul>
                                            ) : (
                                                <p className="p-tareas__empty-inline">
                                                    {moodleConnected
                                                        ? 'No hay tareas disponibles en esta asignatura.'
                                                        : 'Conecta Moodle para cargar tus tareas.'}
                                                </p>
                                            )}
                                        </section>
                                    </section>

                                    {(canLoadMoreTasks || canLoadLessTasks) && (
                                        <footer className="p-tareas__featured-actions">
                                            {canLoadLessTasks && (
                                                <button type="button" onClick={handleLoadLessTasks}>
                                                    CARGAR MENOS TAREAS
                                                </button>
                                            )}
                                            {canLoadMoreTasks && (
                                                <button type="button" onClick={handleLoadMoreTasks}>
                                                    CARGAR MAS TAREAS
                                                </button>
                                            )}
                                        </footer>
                                    )}
                                </article>

                            </section>

                            <aside className="p-tareas__sidebar" aria-label="Calendario y detalle diario">
                                <article className="p-tareas__calendar">
                                    <header>
                                        <h3>{formatMonthLabel(calendarMonth)}</h3>
                                        <section className="p-tareas__calendar-nav">
                                            <button type="button" onClick={() => handleChangeMonth(-1)} aria-label="Mes anterior">
                                                <ChevronLeft size={14} />
                                            </button>
                                            <button type="button" onClick={handleGoToCurrentMonth} aria-label="Volver al mes actual">
                                                HOY
                                            </button>
                                            <button type="button" onClick={() => handleChangeMonth(1)} aria-label="Mes siguiente">
                                                <ChevronRight size={14} />
                                            </button>
                                        </section>
                                    </header>

                                    <section className="p-tareas__calendar-grid" role="grid" aria-label="Calendario de tareas">
                                        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((label) => (
                                            <p key={label} className="p-tareas__calendar-weekday" role="columnheader">{label}</p>
                                        ))}

                                        {calendarCells.map((cell) => {
                                            const isSelected = cell.iso === selectedDate;
                                            const className = [
                                                'p-tareas__calendar-day',
                                                cell.isCurrentMonth ? '' : 'is-outside',
                                                isSelected ? 'is-selected' : '',
                                            ]
                                                .filter(Boolean)
                                                .join(' ');

                                            return (
                                                <button
                                                    key={cell.iso}
                                                    type="button"
                                                    role="gridcell"
                                                    className={className}
                                                    aria-selected={isSelected}
                                                    onClick={() => setSelectedDate(cell.iso)}
                                                >
                                                    <span>{`${cell.day}`.padStart(2, '0')}</span>
                                                    {cell.markerTone && <i className={`is-${cell.markerTone}`} aria-hidden="true" />}
                                                </button>
                                            );
                                        })}
                                    </section>
                                </article>

                                <article className="p-tareas__day-detail">
                                    <header>
                                        <strong>{selectedDateDay}</strong>
                                        <section>
                                            <h4>{selectedDateWeekday}</h4>
                                            <p>DETALLES DEL DIA</p>
                                        </section>
                                    </header>

                                    <section className="p-tareas__day-list">
                                        {dayAgenda.length > 0 ? (
                                            <ul>
                                                {dayAgenda.map((task) => (
                                                    <li key={`agenda-${task.id}`} className={`is-${task.statusTone}`}>
                                                        <small>{task.dueLabel}</small>
                                                        <h5>{task.name}</h5>
                                                        <p>{task.courseName} · {task.unitName}</p>
                                                        <p className={`p-tareas__day-status ${buildBadgeClass(task.statusKey, task.statusTone)}`}>
                                                            {task.statusLabel}
                                                        </p>
                                                        {task.url && (
                                                            <a href={task.url} target="_blank" rel="noreferrer">
                                                                Link en Moodle
                                                            </a>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="p-tareas__empty-inline">
                                                {moodleConnected
                                                    ? 'No hay tareas para esta fecha.'
                                                    : 'Conecta Moodle para visualizar el detalle diario.'}
                                            </p>
                                        )}
                                    </section>
                                </article>
                            </aside>

                            {sideSubjects.length > 0 && (
                                <section className="p-tareas__side-grid" aria-label="Asignaturas contraidas">
                                    {visibleSideSubjects.map((subject) => (
                                        <article key={subject.id} className="p-tareas__side-card">
                                            <button type="button" onClick={() => handleSelectSubject(subject.id)}>
                                                <small>{subject.code}</small>
                                                <h3>{subject.subject}</h3>
                                                <footer>
                                                    <p>
                                                        <strong>{subject.totalTasks.toString().padStart(2, '0')}</strong>
                                                        <span>TAREAS</span>
                                                    </p>
                                                    <span className="p-tareas__side-plus" aria-hidden="true">+</span>
                                                </footer>
                                            </button>
                                        </article>
                                    ))}

                                    {(canLoadMoreSubjects || canLoadLessSubjects) && (
                                        <section className="p-tareas__side-actions">
                                            {canLoadLessSubjects && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setVisibleSubjectCount((previous) =>
                                                            Math.max(minimumVisibleSubjects, previous - SUBJECT_BATCH_SIZE),
                                                        )
                                                    }
                                                >
                                                    VER MENOS ASIGNATURAS
                                                </button>
                                            )}
                                            {canLoadMoreSubjects && (
                                                <button type="button" onClick={() => setVisibleSubjectCount((previous) => previous + SUBJECT_BATCH_SIZE)}>
                                                    VER MAS ASIGNATURAS
                                                </button>
                                            )}
                                        </section>
                                    )}
                                </section>
                            )}
                        </section>
                    ) : (
                        <article className="p-tareas__empty">
                            <h3>Sin tareas disponibles</h3>
                            <p>
                                {moodleConnected
                                    ? 'No se encontraron tareas para esta cuenta en Moodle.'
                                    : 'Conecta Moodle para cargar tus tareas por asignatura.'}
                            </p>
                        </article>
                    )}
                </main>
            </article>
        </>
    );
}
