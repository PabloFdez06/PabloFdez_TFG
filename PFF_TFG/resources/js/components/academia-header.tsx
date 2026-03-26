import { Link } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import { toMoodleMediaUrl } from '@/lib/moodle-media';

type AcademiaHeaderProps = {
    containerClassName: string;
    activePath: '/dashboard' | '/asignaturas' | '/calificaciones' | '/tareas';
    profileAvatarUrl: string | null;
    studentName: string | null;
};

type HeaderNavItem = {
    label: string;
    href: '/dashboard' | '/asignaturas' | '/calificaciones' | '/tareas';
};

const NAV_ITEMS: HeaderNavItem[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Asignaturas', href: '/asignaturas' },
    { label: 'Calificaciones', href: '/calificaciones' },
    { label: 'Tareas', href: '/tareas' },
];

export default function AcademiaHeader({
    containerClassName,
    activePath,
    profileAvatarUrl,
    studentName,
}: AcademiaHeaderProps) {
    const displayName = (studentName ?? '').trim();
    const avatarFallback = displayName !== '' ? displayName.charAt(0).toUpperCase() : 'U';
    const avatarUrl = toMoodleMediaUrl(profileAvatarUrl);

    return (
        <header className="c-academia-header">
            <section className={`c-academia-header__inner ${containerClassName}`}>
                <section className="c-academia-header__left">
                    <Link className="c-academia-header__brand" href="/dashboard">
                        <strong>Organiza<span>T</span></strong>
                    </Link>

                    <nav className="c-academia-header__nav" aria-label="Secciones principales">
                        {NAV_ITEMS.map((item) => (
                            <Link key={item.href} href={item.href} className={item.href === activePath ? 'is-active' : ''}>
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </section>

                <section className="c-academia-header__toolbar" aria-label="Herramientas">
                    <button className="c-academia-header__icon-btn" type="button" aria-label="Notificaciones">
                        <Bell size={16} />
                    </button>
                    <span className="c-academia-header__toolbar-divider" aria-hidden="true" />
                    {displayName !== '' && <span className="c-academia-header__student">{displayName}</span>}
                    <Link className="c-academia-header__avatar" href="/settings/security" aria-label="Abrir configuracion">
                        {avatarUrl ? <img src={avatarUrl} alt="Avatar Moodle" /> : <span>{avatarFallback}</span>}
                    </Link>
                </section>
            </section>
        </header>
    );
}
