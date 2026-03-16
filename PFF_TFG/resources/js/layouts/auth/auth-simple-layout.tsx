import { Link } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="c-auth-layout c-auth-layout--simple">
            <div className="c-auth-layout__container o-page">
                <div className="c-auth-panel">
                    <div className="c-auth-panel__header">
                        <Link
                            href={home()}
                            className="c-auth-brand"
                        >
                            <div className="c-auth-brand__icon">
                                <AppLogoIcon className="c-auth-brand__logo" />
                            </div>
                            <span className="c-auth-brand__title">{title}</span>
                        </Link>

                        <div className="c-auth-panel__intro">
                            <h1 className="c-auth-panel__heading">{title}</h1>
                            <p className="c-auth-panel__description">
                                {description}
                            </p>
                        </div>
                    </div>
                    <div className="c-auth-panel__body">{children}</div>
                </div>
            </div>
        </div>
    );
}
