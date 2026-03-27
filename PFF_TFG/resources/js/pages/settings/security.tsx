import { Form, Head, router, usePage } from '@inertiajs/react';
import { BellRing, Mail, Monitor, Moon, Palette, Settings, ShieldAlert, Sun, UserRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { connect } from '@/actions/App/Http/Controllers/Moodle/MoodleConnectionController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppearance } from '@/hooks/use-appearance';
import type { Appearance } from '@/hooks/use-appearance';
import { disable, enable } from '@/routes/two-factor';

type UserProfile = {
    fullName: string | null;
    email: string | null;
    course: string | null;
    academicYear: string | null;
    avatarUrl: string | null;
};

type SyncStatus = {
    lastSyncLabel: string | null;
    message: string | null;
};

type Preferences = {
    '48h_antes': boolean;
    '24h_antes': boolean;
    mismo_dia: boolean;
    recordatorio_personalizado: boolean;
    recordatorio_personalizado_minutos: number;
    email: boolean;
    push: boolean;
};

type CacheConfig = {
    asignaturasMinutes: number;
    tareasMinutes: number;
};

type Props = {
    moodleConnected: boolean;
    profile: UserProfile;
    syncStatus: SyncStatus;
    preferences: Preferences;
    cacheConfig: CacheConfig;
    canManageTwoFactor?: boolean;
    twoFactorEnabled?: boolean;
};

type PreferenceToggleProps = {
    id: string;
    label: string;
    description: string;
    checked: boolean;
    disabled?: boolean;
    icon?: 'mail' | 'push';
    onToggle: (value: boolean) => void;
};

type SettingsSection = 'usuario' | 'notificaciones' | 'apariencia' | 'peligro';

type SideNavItem = {
    key: SettingsSection;
    title: string;
    description: string;
    icon: typeof UserRound;
};

function PreferenceToggle({
    id,
    label,
    description,
    checked,
    disabled = false,
    icon,
    onToggle,
}: PreferenceToggleProps) {
    return (
        <article className="p-settings__toggle-row">
            <section className="p-settings__toggle-copy">
                <h4>
                    {icon === 'mail' && <Mail size={14} aria-hidden="true" />}
                    {icon === 'push' && <BellRing size={14} aria-hidden="true" />}
                    <span>{label}</span>
                </h4>
                <p>{description}</p>
            </section>

            <button
                id={id}
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                className={[
                    'p-settings__switch',
                    checked ? 'is-on' : '',
                    disabled ? 'is-disabled' : '',
                ]
                    .filter(Boolean)
                    .join(' ')}
                onClick={() => {
                    if (!disabled) {
                        onToggle(!checked);
                    }
                }}
                disabled={disabled}
            >
                <span className="p-settings__switch-thumb" aria-hidden="true" />
            </button>
        </article>
    );
}

export default function Security({
    moodleConnected,
    profile,
    syncStatus,
    preferences,
    cacheConfig,
    canManageTwoFactor = false,
    twoFactorEnabled = false,
}: Props) {
    const [showReconnectForm, setShowReconnectForm] = useState(false);
    const flash = (usePage().props.flash ?? {}) as { success?: string; error?: string };
    const { appearance, updateAppearance } = useAppearance();

    const [preferencesData, setPreferencesData] = useState<Preferences>(preferences);
    const [processing, setProcessing] = useState(false);

    const getSectionFromHash = (): SettingsSection => {
        if (typeof window === 'undefined') {
            return 'usuario';
        }

        const hash = window.location.hash.replace('#', '');

        if (hash === 'usuario' || hash === 'notificaciones' || hash === 'apariencia' || hash === 'peligro') {
            return hash;
        }

        return 'usuario';
    };

    const [activeSection, setActiveSection] = useState<SettingsSection>(() => getSectionFromHash());

    const sidebarItems: SideNavItem[] = [
        {
            key: 'usuario',
            title: 'Usuario',
            description: 'Info del usuario, Moodle y datos',
            icon: UserRound,
        },
        {
            key: 'notificaciones',
            title: 'Notificaciones',
            description: 'Recordatorios y canales',
            icon: BellRing,
        },
        {
            key: 'apariencia',
            title: 'Apariencia',
            description: 'Tema visual de la app',
            icon: Palette,
        },
        {
            key: 'peligro',
            title: 'Zona de peligro',
            description: 'Seguridad, cierre y cuenta',
            icon: ShieldAlert,
        },
    ];

    useEffect(() => {
        const syncSection = () => {
            setActiveSection(getSectionFromHash());
        };

        syncSection();
        window.addEventListener('hashchange', syncSection);

        return () => {
            window.removeEventListener('hashchange', syncSection);
        };
    }, []);

    const handleSectionChange = (section: SettingsSection) => {
        setActiveSection(section);

        if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${section}`);
        }
    };

    const appearanceOptions: Array<{ value: Appearance; label: string; icon: typeof Sun }> = [
        { value: 'light', label: 'Claro', icon: Sun },
        { value: 'dark', label: 'Oscuro', icon: Moon },
        { value: 'system', label: 'Sistema', icon: Monitor },
    ];

    const persistPreference = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
        const next = {
            ...preferencesData,
            [key]: value,
        };

        setPreferencesData(next);
        setProcessing(true);

        router.post('/settings/security/preferences', next, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
            onFinish: () => setProcessing(false),
        });
    };

    const closeSettings = () => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
            window.history.back();

            return;
        }

        router.visit('/dashboard');
    };

    return (
        <>
            <Head title="Configuración" />

            <main className="p-settings" aria-labelledby="settings-title">
                <header className="p-settings__page-header" aria-label="Cabecera de configuración">
                    <section className="p-settings__page-header-brand">
                        <span className="p-settings__page-header-icon" aria-hidden="true">
                            <Settings size={14} />
                        </span>
                        <p>Configuración</p>
                    </section>

                    <section className="p-settings__page-header-actions">
                        <button type="button" className="p-settings__close" onClick={closeSettings} aria-label="Salir de configuración">
                            <X size={13} />
                        </button>
                    </section>
                </header>

                <section className="p-settings__workspace">
                    <aside className="p-settings__side" aria-label="Navegación de configuración">
                        <header className="p-settings__side-header">
                            <h2>Settings</h2>
                            <p>Management</p>
                        </header>

                        <nav className="p-settings__side-nav" aria-label="Apartados de configuración">
                            {sidebarItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeSection === item.key;

                                return (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => handleSectionChange(item.key)}
                                        aria-pressed={isActive}
                                        className={[
                                            'p-settings__side-link',
                                            isActive ? 'is-active' : '',
                                        ]
                                            .filter(Boolean)
                                            .join(' ')}
                                    >
                                        <Icon size={14} aria-hidden="true" />
                                        <section>
                                            <p>{item.title}</p>
                                            <span>{item.description}</span>
                                        </section>
                                    </button>
                                );
                            })}
                        </nav>
                    </aside>

                    <section className="p-settings__main">
                        <header className="p-settings__hero">
                            <section className="p-settings__hero-main">
                                <p className="p-settings__eyebrow">Ajustes del sistema</p>

                                <h1 id="settings-title" className="p-settings__title">
                                    PERFIL<span>.</span>
                                </h1>
                                <p className="p-settings__description">Gestión de identidad académica y sincronización de datos.</p>
                            </section>
                        </header>

                        {(flash.success || flash.error || syncStatus.message) && (
                            <section className="p-settings__flash" aria-live="polite">
                                <p className={flash.error || syncStatus.message ? 'is-error' : 'is-success'}>
                                    {flash.error ?? syncStatus.message ?? flash.success}
                                </p>
                            </section>
                        )}

                        <section className="p-settings__content" aria-live="polite">
                        {activeSection === 'usuario' && (
                            <section className="p-settings__panel">
                                <article className="p-settings__section">
                                    <header className="p-settings__section-header">
                                        <h2>Información de usuario</h2>
                                        <span aria-hidden="true" />
                                    </header>

                                    <dl className="p-settings__profile-grid">
                                        <div className="p-settings__profile-item">
                                            <dt>Nombre completo</dt>
                                            <dd>{profile.fullName ?? 'No disponible'}</dd>
                                        </div>
                                        <div className="p-settings__profile-item">
                                            <dt>Correo institucional</dt>
                                            <dd>{profile.email ?? 'No disponible'}</dd>
                                        </div>
                                        <div className="p-settings__profile-item">
                                            <dt>Curso actual</dt>
                                            <dd>{profile.course ?? 'No disponible'}</dd>
                                        </div>
                                        <div className="p-settings__profile-item">
                                            <dt>Año académico</dt>
                                            <dd>{profile.academicYear ?? 'No disponible'}</dd>
                                        </div>
                                    </dl>
                                </article>

                                <article className="p-settings__section">
                                    <header className="p-settings__section-header">
                                        <h2>Conexión a Moodle</h2>
                                        <span aria-hidden="true" />
                                    </header>

                                    <section className="p-settings__moodle-card" aria-live="polite">
                                        <section>
                                            <p className="p-settings__moodle-title">
                                                {moodleConnected ? 'Conectado a Moodle' : 'Moodle no conectado'}
                                            </p>
                                            <p className="p-settings__moodle-meta">
                                                {moodleConnected
                                                    ? `Última sincronización: hoy a las ${syncStatus.lastSyncLabel ?? '--:--'}`
                                                    : 'Inicia sesión para sincronizar tus datos académicos'}
                                            </p>
                                        </section>

                                        <section className="p-settings__moodle-actions">
                                            {moodleConnected && (
                                                <>
                                                    <Form method="post" action="/settings/security/moodle/disconnect">
                                                        {({ processing: disconnectProcessing }) => (
                                                            <Button
                                                                type="submit"
                                                                variant="destructive"
                                                                className="p-settings__danger-button"
                                                                disabled={disconnectProcessing}
                                                            >
                                                                {disconnectProcessing ? 'Cerrando...' : 'Cerrar sesión'}
                                                            </Button>
                                                        )}
                                                    </Form>

                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => setShowReconnectForm((value) => !value)}
                                                        className="p-settings__outline-button"
                                                    >
                                                        Reconectar
                                                    </Button>
                                                </>
                                            )}
                                        </section>
                                    </section>

                                    {(showReconnectForm || !moodleConnected) && (
                                        <Form method="post" action={connect().url} className="p-settings__connect-form">
                                            {({ errors, processing: connectProcessing }) => (
                                                <>
                                                    <section className="p-settings__field">
                                                        <label htmlFor="moodle_username">Usuario Moodle</label>
                                                        <Input
                                                            id="moodle_username"
                                                            name="moodle_username"
                                                            required
                                                            autoComplete="username"
                                                        />
                                                        <InputError message={errors.moodle_username} />
                                                    </section>

                                                    <section className="p-settings__field">
                                                        <label htmlFor="moodle_password">Contraseña Moodle</label>
                                                        <Input
                                                            id="moodle_password"
                                                            name="moodle_password"
                                                            type="password"
                                                            required
                                                            autoComplete="current-password"
                                                        />
                                                        <InputError message={errors.moodle_password} />
                                                    </section>

                                                    <Button type="submit" disabled={connectProcessing}>
                                                        {connectProcessing ? 'Conectando...' : 'Guardar conexión'}
                                                    </Button>
                                                </>
                                            )}
                                        </Form>
                                    )}

                                    <p className="p-settings__caption">
                                        Las credenciales están cifradas y almacenadas de forma segura. La sesión se renueva automáticamente.
                                    </p>
                                </article>

                                <article className="p-settings__section">
                                    <header className="p-settings__section-header">
                                        <h2>Actualización de datos</h2>
                                        <span aria-hidden="true" />
                                    </header>

                                    <section className="p-settings__cache-grid" aria-label="Frecuencias de caché">
                                        <article className="p-settings__cache-card">
                                            <p>Caché de asignaturas</p>
                                            <strong>{cacheConfig.asignaturasMinutes} minutos</strong>
                                        </article>
                                        <article className="p-settings__cache-card">
                                            <p>Caché de tareas</p>
                                            <strong>{cacheConfig.tareasMinutes} minutos</strong>
                                        </article>
                                    </section>
                                </article>
                            </section>
                        )}

                        {activeSection === 'notificaciones' && (
                            <section className="p-settings__panel">
                                <article className="p-settings__section">
                                    <header className="p-settings__section-header">
                                        <h2>Recordatorios por tiempo</h2>
                                        <span aria-hidden="true" />
                                    </header>

                                    <section className="p-settings__toggles">
                                        <PreferenceToggle
                                            id="reminder-48"
                                            label="48 horas antes"
                                            description="Recibir notificación dos días antes de la fecha límite"
                                            checked={preferencesData['48h_antes']}
                                            disabled={processing}
                                            onToggle={(value) => persistPreference('48h_antes', value)}
                                        />
                                        <PreferenceToggle
                                            id="reminder-24"
                                            label="24 horas antes"
                                            description="Recibir notificación un día antes de la fecha límite"
                                            checked={preferencesData['24h_antes']}
                                            disabled={processing}
                                            onToggle={(value) => persistPreference('24h_antes', value)}
                                        />
                                        <PreferenceToggle
                                            id="reminder-same-day"
                                            label="El mismo día"
                                            description="Recibir notificación durante la mañana del día de entrega"
                                            checked={preferencesData.mismo_dia}
                                            disabled={processing}
                                            onToggle={(value) => persistPreference('mismo_dia', value)}
                                        />

                                        <section className="p-settings__custom-reminder">
                                            <PreferenceToggle
                                                id="custom-reminder"
                                                label="Recordatorio personalizado"
                                                description="Define cada cuántos minutos quieres recibir la alerta"
                                                checked={preferencesData.recordatorio_personalizado}
                                                disabled={processing}
                                                onToggle={(value) => persistPreference('recordatorio_personalizado', value)}
                                            />

                                            <label htmlFor="recordatorio_personalizado_minutos">
                                                Frecuencia personalizada (minutos)
                                            </label>
                                            <Input
                                                id="recordatorio_personalizado_minutos"
                                                type="number"
                                                min={1}
                                                max={10080}
                                                value={preferencesData.recordatorio_personalizado_minutos}
                                                disabled={!preferencesData.recordatorio_personalizado || processing}
                                                onChange={(event) => {
                                                    const value = Math.max(1, Number(event.target.value || 1));
                                                    setPreferencesData((current) => ({
                                                        ...current,
                                                        recordatorio_personalizado_minutos: value,
                                                    }));
                                                }}
                                                onBlur={() =>
                                                    persistPreference(
                                                        'recordatorio_personalizado_minutos',
                                                        Math.max(1, Number(preferencesData.recordatorio_personalizado_minutos || 1)),
                                                    )
                                                }
                                            />
                                        </section>
                                    </section>
                                </article>

                                <article className="p-settings__section">
                                    <header className="p-settings__section-header">
                                        <h2>Canales de notificación</h2>
                                        <span aria-hidden="true" />
                                    </header>

                                    <section className="p-settings__toggles">
                                        <PreferenceToggle
                                            id="channel-email"
                                            label="Correo electrónico"
                                            description={profile.email ? `Enviar a ${profile.email}` : 'Enviar por correo institucional'}
                                            checked={preferencesData.email}
                                            disabled={processing}
                                            icon="mail"
                                            onToggle={(value) => persistPreference('email', value)}
                                        />
                                        <PreferenceToggle
                                            id="channel-push"
                                            label="Notificaciones push"
                                            description="Alertas en tiempo real en el navegador"
                                            checked={preferencesData.push}
                                            disabled={processing}
                                            icon="push"
                                            onToggle={(value) => persistPreference('push', value)}
                                        />
                                    </section>
                                </article>
                            </section>
                        )}

                        {activeSection === 'apariencia' && (
                            <section className="p-settings__panel">
                                <article className="p-settings__section">
                                    <header className="p-settings__section-header">
                                        <h2>Apariencia</h2>
                                        <span aria-hidden="true" />
                                    </header>

                                    <section className="p-settings__appearance-card" aria-label="Apariencia de la aplicación">
                                        <p className="p-settings__appearance-title">Tema de la aplicación</p>
                                        <p className="p-settings__appearance-description">
                                            Elige cómo quieres visualizar la interfaz en toda la aplicación.
                                        </p>

                                        <nav className="p-settings__appearance-options" aria-label="Selector de apariencia">
                                            {appearanceOptions.map(({ value, label, icon: Icon }) => (
                                                <button
                                                    key={value}
                                                    type="button"
                                                    className={[
                                                        'p-settings__appearance-option',
                                                        appearance === value ? 'is-active' : '',
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' ')}
                                                    onClick={() => updateAppearance(value)}
                                                    aria-pressed={appearance === value}
                                                >
                                                    <Icon size={14} aria-hidden="true" />
                                                    <span>{label}</span>
                                                </button>
                                            ))}
                                        </nav>
                                    </section>
                                </article>
                            </section>
                        )}

                        {activeSection === 'peligro' && (
                            <section className="p-settings__panel">
                                {canManageTwoFactor && (
                                    <article className="p-settings__section">
                                        <header className="p-settings__section-header">
                                            <h2>Seguridad de acceso</h2>
                                            <span aria-hidden="true" />
                                        </header>

                                        <section className="p-settings__two-factor">
                                            <p className="p-settings__two-factor-status">
                                                Verificación en 2 pasos: <b>{twoFactorEnabled ? 'Activada' : 'Desactivada'}</b>
                                            </p>

                                            {twoFactorEnabled ? (
                                                <Form method="delete" action={disable().url}>
                                                    {({ processing: disabling }) => (
                                                        <button
                                                            type="submit"
                                                            role="switch"
                                                            aria-checked="true"
                                                            aria-label="Desactivar verificación en 2 pasos"
                                                            className={[
                                                                'p-settings__switch',
                                                                'is-on',
                                                                disabling ? 'is-disabled' : '',
                                                            ].join(' ')}
                                                            disabled={disabling}
                                                        >
                                                            <span className="p-settings__switch-thumb" aria-hidden="true" />
                                                        </button>
                                                    )}
                                                </Form>
                                            ) : (
                                                <Form method="post" action={enable().url}>
                                                    {({ processing: enabling }) => (
                                                        <button
                                                            type="submit"
                                                            role="switch"
                                                            aria-checked="false"
                                                            aria-label="Activar verificación en 2 pasos"
                                                            className={[
                                                                'p-settings__switch',
                                                                enabling ? 'is-disabled' : '',
                                                            ]
                                                                .filter(Boolean)
                                                                .join(' ')}
                                                            disabled={enabling}
                                                        >
                                                            <span className="p-settings__switch-thumb" aria-hidden="true" />
                                                        </button>
                                                    )}
                                                </Form>
                                            )}
                                        </section>
                                    </article>
                                )}

                                <article className="p-settings__danger-zone">
                                    <header>
                                        <h2>Zona de peligro</h2>
                                    </header>

                                    <section className="p-settings__danger-row">
                                        <section className="p-settings__danger-block">
                                            <h3>Eliminar mi cuenta</h3>
                                            <p>
                                                La eliminación de la cuenta es permanente y conlleva la pérdida de todo el historial académico almacenado.
                                            </p>

                                            <Form
                                                method="delete"
                                                action="/settings/security/account"
                                                onBefore={() =>
                                                    window.confirm('Esta acción eliminará tu cuenta de forma permanente. ¿Deseas continuar?')
                                                }
                                            >
                                                {({ processing: deleting }) => (
                                                    <Button type="submit" variant="destructive" disabled={deleting}>
                                                        {deleting ? 'Eliminando...' : 'Eliminar mi cuenta'}
                                                    </Button>
                                                )}
                                            </Form>
                                        </section>

                                        <section className="p-settings__danger-block">
                                            <h3>Cerrar sesión</h3>
                                            <p>Al cerrar sesión se cerrará también el acceso del usuario en esta aplicación.</p>

                                            <Form method="post" action="/logout">
                                                {({ processing: loggingOut }) => (
                                                    <Button type="submit" variant="destructive" disabled={loggingOut}>
                                                        {loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
                                                    </Button>
                                                )}
                                            </Form>
                                        </section>
                                    </section>
                                </article>
                            </section>
                        )}
                        </section>

                        <footer className="p-settings__footer">
                            <p className="p-settings__version">V2.4.0 <span>Release build</span></p>
                            <p className="p-settings__latency">Sincronización total: <b>14.2ms LAT</b></p>
                        </footer>
                    </section>
                </section>
            </main>
        </>
    );
}
