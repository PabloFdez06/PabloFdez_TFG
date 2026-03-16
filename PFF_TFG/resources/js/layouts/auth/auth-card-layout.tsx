import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { home } from '@/routes';

export default function AuthCardLayout({
    children,
    title,
    description,
}: PropsWithChildren<{
    name?: string;
    title?: string;
    description?: string;
}>) {
    return (
        <div className="c-auth-layout c-auth-layout--card">
            <div className="c-auth-layout__container o-page">
                <Link
                    href={home()}
                    className="c-auth-brand"
                >
                    <div className="c-auth-brand__icon">
                        <AppLogoIcon className="c-auth-brand__logo" />
                    </div>
                </Link>

                <div className="c-auth-panel c-auth-panel--card">
                    <Card className="c-card">
                        <CardHeader className="c-card__header">
                            <CardTitle className="c-auth-panel__heading">{title}</CardTitle>
                            <CardDescription>{description}</CardDescription>
                        </CardHeader>
                        <CardContent className="c-card__content">
                            {children}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
