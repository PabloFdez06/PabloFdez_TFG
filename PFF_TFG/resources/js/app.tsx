import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TooltipProvider } from '@/components/ui/tooltip';
import '../scss/app.scss';
import { initializeTheme } from '@/hooks/use-appearance';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

function InertiaLoadingOverlay() {
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const removeStart = router.on('start', () => {
            setIsLoading(true);
        });

        const hideLoading = () => {
            setIsLoading(false);
        };

        const removeFinish = router.on('finish', hideLoading);
        const removeError = router.on('error', hideLoading);
        const removeInvalid = router.on('invalid', hideLoading);

        return () => {
            removeStart();
            removeFinish();
            removeError();
            removeInvalid();
        };
    }, []);

    if (!isLoading) {
        return null;
    }

    return (
        <section className="c-global-loading" role="status" aria-live="polite" aria-label="Cargando datos de Moodle">
            <section className="c-global-loading__panel">
                <span className="c-global-loading__spinner" aria-hidden="true" />
                <p>Cargando datos completos de Moodle...</p>
            </section>
        </section>
    );
}

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <StrictMode>
                <TooltipProvider delayDuration={0}>
                    <InertiaLoadingOverlay />
                    <App {...props} />
                </TooltipProvider>
            </StrictMode>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
