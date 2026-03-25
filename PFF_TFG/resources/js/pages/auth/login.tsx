import { Form, Head, Link } from '@inertiajs/react';
import type { CSSProperties } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { home, register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
};

export default function Login({
    status,
    canResetPassword,
    canRegister,
}: Props) {
    return (
        <>
            <Head title="Log in" />

            <main className="c-auth-editorial c-auth-editorial--login">
                <section
                    className="c-auth-editorial__hero"
                    aria-hidden="true"
                    style={{
                        '--auth-hero-image': 'url("https://www.figma.com/api/mcp/asset/09035ce8-031f-4d6a-8a86-e9e729994e2b")',
                    } as CSSProperties}
                >
                    <header className="c-auth-editorial__hero-top">SYSTEM_ARCHIVE_v.2.4</header>
                    <section className="c-auth-editorial__hero-content">
                        <h1>PRECISION ACADEMICA</h1>
                        <p>
                            Infraestructura digital disenada para la excelencia
                            editorial y la preservacion del conocimiento tecnico
                            de vanguardia.
                        </p>
                    </section>
                </section>

                <section className="c-auth-editorial__panel-wrap">
                    <article className="c-auth-editorial__panel">
                        <header className="c-auth-editorial__header">
                            <Link href={home()} className="c-auth-editorial__brand">
                                <span>OrganizaT</span>
                            </Link>
                            <h2>Iniciar Sesion</h2>
                            <p>Acceso al archivo tecnico academico.</p>
                        </header>

                        <Form
                            method="post"
                            action={store().url}
                            resetOnSuccess={['password']}
                            className="c-auth-form c-auth-form--editorial"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <div className="c-auth-form__fields">
                                        <div className="c-auth-form__field c-auth-form__field--filled">
                                            <Label htmlFor="email">Correo electronico</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                name="email"
                                                required
                                                autoFocus
                                                tabIndex={1}
                                                autoComplete="email"
                                                placeholder="usuario@institucion.edu"
                                            />
                                            <InputError message={errors.email} />
                                        </div>

                                        <div className="c-auth-form__field c-auth-form__field--filled">
                                            <div className="c-auth-form__label-row">
                                                <Label htmlFor="password">Contrasena</Label>
                                            </div>
                                            <PasswordInput
                                                id="password"
                                                name="password"
                                                required
                                                tabIndex={2}
                                                autoComplete="current-password"
                                                placeholder="************"
                                            />
                                            <InputError message={errors.password} />
                                        </div>

                                        <div className="c-auth-form__editorial-actions">
                                            <label htmlFor="remember" className="c-auth-form__check">
                                                <Checkbox
                                                    id="remember"
                                                    name="remember"
                                                    tabIndex={3}
                                                />
                                                <span>Recordarme</span>
                                            </label>

                                            {canResetPassword && (
                                                <TextLink
                                                    href={request()}
                                                    className="c-auth-form__meta-link"
                                                    tabIndex={4}
                                                >
                                                    Olvide mi contrasena
                                                </TextLink>
                                            )}
                                        </div>

                                        <Button
                                            type="submit"
                                            className="c-auth-form__submit c-auth-form__submit--editorial"
                                            tabIndex={5}
                                            disabled={processing}
                                            data-test="login-button"
                                        >
                                            {processing && <Spinner />}
                                            Iniciar sesion
                                        </Button>
                                    </div>

                                    {canRegister && (
                                        <footer className="c-auth-form__alt c-auth-form__alt--centered">
                                            <span>No tienes una cuenta?</span>
                                            <TextLink href={register()} tabIndex={6}>
                                                Crear una cuenta
                                            </TextLink>
                                        </footer>
                                    )}
                                </>
                            )}
                        </Form>

                        {status && (
                            <div className="c-auth-form__status">{status}</div>
                        )}
                    </article>
                </section>
            </main>
        </>
    );
}
