import { Form, Head, usePage } from '@inertiajs/react';
import Heading from '@/components/heading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type EndpointItem = {
    key: string;
    method: string;
    path: string;
};

type MoodleConsoleProps = {
    selectedEndpoint: string | null;
    courseId: number | null;
    endpointResponse: unknown;
    endpointError: string | null;
    endpoints: EndpointItem[];
    moodleConnected: boolean;
    moodleUsername: string | null;
    preferences: {
        '48h_antes': boolean;
        '24h_antes': boolean;
        mismo_dia: boolean;
        email: boolean;
        push: boolean;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Moodle Console',
        href: '/moodle-console',
    },
];

function prettyJson(value: unknown): string {
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

export default function MoodleConsole({
    selectedEndpoint,
    courseId,
    endpointResponse,
    endpointError,
    endpoints,
    moodleConnected,
    moodleUsername,
    preferences,
}: MoodleConsoleProps) {
    const page = usePage();
    const flash = (page.props.flash ?? {}) as { success?: string; error?: string };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Moodle Console" />

            <main className="space-y-6 p-4">
                <header>
                    <Heading
                        title="Moodle Console"
                        description="Ejecuta endpoints Moodle desde la UI y visualiza la respuesta JSON sin salir del panel"
                    />
                </header>

                {(flash.success || flash.error) && (
                    <Alert>
                        <AlertTitle>{flash.error ? 'Error' : 'Operacion completada'}</AlertTitle>
                        <AlertDescription>{flash.error ?? flash.success}</AlertDescription>
                    </Alert>
                )}

                <section className="grid gap-6 lg:grid-cols-2">
                    <article>
                        <Card>
                            <CardHeader>
                                <CardTitle>1) Conectar cuenta Moodle</CardTitle>
                                <CardDescription>
                                    Verifica credenciales CAS y guarda usuario/password Moodle cifrada.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Form method="post" action="/moodle-connect" className="space-y-4">
                                    {({ errors, processing }) => (
                                        <>
                                            <section className="space-y-2">
                                                <Label htmlFor="moodle_username">Usuario Moodle</Label>
                                                <Input
                                                    id="moodle_username"
                                                    name="moodle_username"
                                                    defaultValue={moodleUsername ?? ''}
                                                    required
                                                />
                                                {errors.moodle_username && (
                                                    <p className="text-sm text-destructive">{errors.moodle_username}</p>
                                                )}
                                            </section>

                                            <section className="space-y-2">
                                                <Label htmlFor="moodle_password">Password Moodle</Label>
                                                <Input
                                                    id="moodle_password"
                                                    name="moodle_password"
                                                    type="password"
                                                    required
                                                />
                                                {errors.moodle_password && (
                                                    <p className="text-sm text-destructive">{errors.moodle_password}</p>
                                                )}
                                            </section>

                                            <Button type="submit" disabled={processing}>
                                                {processing ? 'Conectando...' : 'Conectar Moodle'}
                                            </Button>
                                        </>
                                    )}
                                </Form>
                            </CardContent>
                        </Card>
                    </article>

                    <article>
                        <Card>
                            <CardHeader>
                                <CardTitle>2) Preferencias de notificacion</CardTitle>
                                <CardDescription>
                                    Gestiona 48h_antes, 24h_antes, mismo_dia, email y push desde panel.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Form
                                    method="post"
                                    action="/moodle-console/preferences"
                                    className="space-y-4"
                                >
                                    {({ processing }) => (
                                        <>
                                            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <label className="flex items-center gap-2 text-sm">
                                                    <input type="hidden" name="48h_antes" value="0" />
                                                    <input type="checkbox" name="48h_antes" value="1" defaultChecked={preferences['48h_antes']} />
                                                    48h antes
                                                </label>
                                                <label className="flex items-center gap-2 text-sm">
                                                    <input type="hidden" name="24h_antes" value="0" />
                                                    <input type="checkbox" name="24h_antes" value="1" defaultChecked={preferences['24h_antes']} />
                                                    24h antes
                                                </label>
                                                <label className="flex items-center gap-2 text-sm">
                                                    <input type="hidden" name="mismo_dia" value="0" />
                                                    <input type="checkbox" name="mismo_dia" value="1" defaultChecked={preferences.mismo_dia} />
                                                    Mismo dia
                                                </label>
                                                <label className="flex items-center gap-2 text-sm">
                                                    <input type="hidden" name="email" value="0" />
                                                    <input type="checkbox" name="email" value="1" defaultChecked={preferences.email} />
                                                    Email
                                                </label>
                                                <label className="flex items-center gap-2 text-sm">
                                                    <input type="hidden" name="push" value="0" />
                                                    <input type="checkbox" name="push" value="1" defaultChecked={preferences.push} />
                                                    Push
                                                </label>
                                            </section>
                                            <Button type="submit" disabled={processing}>
                                                {processing ? 'Guardando...' : 'Guardar preferencias'}
                                            </Button>
                                        </>
                                    )}
                                </Form>
                            </CardContent>
                        </Card>
                    </article>
                </section>

                <section>
                    <Card>
                        <CardHeader>
                            <CardTitle>3) Ejecutar endpoints</CardTitle>
                            <CardDescription>
                                Ejecuta cualquier endpoint Moodle y visualiza la salida en formato JSON.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Form method="get" action="/moodle-console" className="space-y-4">
                                {({ processing }) => (
                                    <>
                                        <section className="space-y-2">
                                            <Label htmlFor="action">Endpoint</Label>
                                            <select
                                                id="action"
                                                name="action"
                                                defaultValue={selectedEndpoint ?? ''}
                                                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                                            >
                                                <option value="">Selecciona un endpoint</option>
                                                {endpoints.map((endpoint) => (
                                                    <option key={endpoint.key} value={endpoint.key}>
                                                        {endpoint.method} {endpoint.path}
                                                    </option>
                                                ))}
                                            </select>
                                        </section>

                                        <section className="space-y-2">
                                            <Label htmlFor="course_id">course_id (solo para /api/tareas/{'{courseId}'})</Label>
                                            <Input
                                                id="course_id"
                                                name="course_id"
                                                type="number"
                                                min={1}
                                                defaultValue={courseId ?? ''}
                                            />
                                        </section>

                                        <Button type="submit" disabled={processing || !moodleConnected}>
                                            {processing ? 'Ejecutando...' : 'Ejecutar endpoint'}
                                        </Button>
                                    </>
                                )}
                            </Form>

                            {!moodleConnected && (
                                <Alert>
                                    <AlertTitle>Cuenta Moodle no conectada</AlertTitle>
                                    <AlertDescription>
                                        Debes conectar primero tu cuenta Moodle para ejecutar endpoints academicos.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {endpointError && (
                                <Alert>
                                    <AlertTitle>Error en ejecucion</AlertTitle>
                                    <AlertDescription>{endpointError}</AlertDescription>
                                </Alert>
                            )}

                            {selectedEndpoint && endpointResponse !== null && !endpointError && (
                                <section className="space-y-2">
                                    <Label>Salida JSON</Label>
                                    <pre className="max-h-[28rem] overflow-auto rounded-md border bg-muted p-4 text-xs">
                                        {prettyJson(endpointResponse)}
                                    </pre>
                                </section>
                            )}
                        </CardContent>
                    </Card>
                </section>
            </main>
        </AppLayout>
    );
}
