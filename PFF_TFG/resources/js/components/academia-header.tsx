import { Link } from '@inertiajs/react';
import { Bell, Boxes, Search } from 'lucide-react';

type AcademiaHeaderProps = {
    containerClassName: string;
    activePath: '/dashboard' | '/asignaturas' | '/calificaciones';
    profileAvatarUrl: string | null;
    searchPlaceholder?: string;
};

type HeaderNavItem = {
    label: string;
    href: '/dashboard' | '/asignaturas' | '/calificaciones';
};

const NAV_ITEMS: HeaderNavItem[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Asignaturas', href: '/asignaturas' },
    { label: 'Calificaciones', href: '/calificaciones' },
];

export default function AcademiaHeader({
    containerClassName,
    activePath,
    profileAvatarUrl,
    searchPlaceholder = 'Buscar recursos',
}: AcademiaHeaderProps) {
    return (
        <header className="c-academia-header">
            <section className={`c-academia-header__inner ${containerClassName}`}>
                <section className="c-academia-header__left">
                    <Link className="c-academia-header__brand" href="/dashboard">
                        <span className="c-academia-header__logo" aria-hidden="true">
                            <Boxes size={14} />
                        </span>
                        <strong>Academia</strong>
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
                    <label className="c-academia-header__search">
                        <Search aria-hidden="true" />
                        <input type="search" placeholder={searchPlaceholder} />
                    </label>
                    <button className="c-academia-header__icon-btn" type="button" aria-label="Notificaciones">
                        <Bell size={16} />
                    </button>
                    <span className="c-academia-header__avatar" aria-hidden="true">
                        {profileAvatarUrl && <img src={profileAvatarUrl} alt="Avatar Moodle" />}
                    </span>
                </section>
            </section>
        </header>
    );
}
