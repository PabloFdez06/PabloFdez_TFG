import { Form, Head, Link } from '@inertiajs/react';
import type { CSSProperties } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { store } from '@/routes/register';

export default function Register() {
    return (
        <>
            <Head title="Register" />

            <main className="c-auth-editorial c-auth-editorial--register">
                <section
                    className="c-auth-editorial__hero"
                    aria-hidden="true"
                    style={{
                        '--auth-hero-image': 'url("https://www.figma.com/api/mcp/asset/a1bb3190-6197-477b-b50f-66bef91760b5")',
                    } as CSSProperties}
                >
                    <header className="c-auth-editorial__hero-pill">Ecosistema V2.4</header>
                    <section className="c-auth-editorial__hero-content">
                        <h1>PRECISION ACADEMICA.</h1>
                        <p>
                            Unase a una infraestructura disenada para la excelencia
                            editorial. Un espacio donde la estructura tecnica se
                            encuentra con la vision intelectual.
                        </p>
                    </section>

                    <footer className="c-auth-editorial__hero-footer">
                        <span>OrganizaT Excellence</span>
                    </footer>
                </section>

                <section className="c-auth-editorial__panel-wrap">
                    <article className="c-auth-editorial__panel c-auth-editorial__panel--register">
                        <header className="c-auth-editorial__header c-auth-editorial__header--register">
                            <Link href={login()} className="c-auth-editorial__brand">
                                <span>OrganizaT</span>
                            </Link>
                            <h2>Crear nueva cuenta</h2>
                            <p>Complete los detalles para iniciar su proceso editorial.</p>
                        </header>

                        <Form
                            method="post"
                            action={store().url}
                            resetOnSuccess={['password', 'password_confirmation']}
                            disableWhileProcessing
                            className="c-auth-form c-auth-form--editorial"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <div className="c-auth-form__fields">
                                        <div className="c-auth-form__field c-auth-form__field--filled">
                                            <Label htmlFor="name">Nombre completo</Label>
                                            <Input
                                                id="name"
                                                type="text"
                                                required
                                                autoFocus
                                                tabIndex={1}
                                                autoComplete="name"
                                                name="name"
                                                placeholder="Dr. Julian Casablancas"
                                            />
                                            <InputError message={errors.name} />
                                        </div>

                                        <div className="c-auth-form__field c-auth-form__field--filled">
                                            <Label htmlFor="email">Correo electronico</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                required
                                                tabIndex={2}
                                                autoComplete="email"
                                                name="email"
                                                placeholder="editorial@university.edu"
                                            />
                                            <InputError message={errors.email} />
                                        </div>

                                        <section className="c-auth-form__grid-two" aria-label="Credenciales de acceso">
                                            <div className="c-auth-form__field c-auth-form__field--filled">
                                                <Label htmlFor="password">Contrasena</Label>
                                                <PasswordInput
                                                    id="password"
                                                    required
                                                    tabIndex={3}
                                                    autoComplete="new-password"
                                                    name="password"
                                                    placeholder="********"
                                                />
                                                <InputError message={errors.password} />
                                            </div>

                                            <div className="c-auth-form__field c-auth-form__field--filled">
                                                <Label htmlFor="password_confirmation">Confirmar contrasena</Label>
                                                <PasswordInput
                                                    id="password_confirmation"
                                                    required
                                                    tabIndex={4}
                                                    autoComplete="new-password"
                                                    name="password_confirmation"
                                                    placeholder="********"
                                                />
                                                <InputError message={errors.password_confirmation} />
                                            </div>
                                        </section>

                                        <Button
                                            type="submit"
                                            className="c-auth-form__submit c-auth-form__submit--editorial"
                                            tabIndex={5}
                                            data-test="register-user-button"
                                            disabled={processing}
                                        >
                                            {processing && <Spinner />}
                                            Crear cuenta
                                        </Button>
                                    </div>

                                    <footer className="c-auth-form__alt c-auth-form__alt--centered">
                                        <span>Ya tengo una cuenta?</span>
                                        <TextLink href={login()} tabIndex={6}>
                                            Log in
                                        </TextLink>
                                    </footer>
                                </>
                            )}
                        </Form>

                        <footer className="c-auth-editorial__legal">
                            <span>Terminos de servicio</span>
                            <span>Privacidad</span>
                            <span>Soporte tecnico</span>
                        </footer>
                    </article>
                </section>
            </main>
        </>
    );
}
