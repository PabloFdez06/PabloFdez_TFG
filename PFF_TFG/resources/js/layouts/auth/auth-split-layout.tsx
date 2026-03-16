import { Link, usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { name } = usePage().props;

    return (
        <div className="c-auth-layout c-auth-layout--split">
            <div className="c-auth-layout__media">
                <div className="c-auth-layout__media-overlay" />
                <Link
                    href={home()}
                    className="c-auth-brand c-auth-brand--light"
                >
                    <AppLogoIcon className="c-auth-brand__logo" />
                    {name}
                </Link>
            </div>
            <div className="c-auth-layout__container">
                <div className="c-auth-panel c-auth-panel--split">
                    <Link
                        href={home()}
                        className="c-auth-brand"
                    >
                        <AppLogoIcon className="c-auth-brand__logo" />
                    </Link>
                    <div className="c-auth-panel__intro">
                        <h1 className="c-auth-panel__heading">{title}</h1>
                        <p className="c-auth-panel__description">
                            {description}
                        </p>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
