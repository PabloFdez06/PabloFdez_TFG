---
applyTo: '**'
---

# Patrón Inertia.js para Componentes React + Laravel

## Principios Fundamentales

**NUNCA usar `fetch()` o `axios` en componentes de Inertia**. Todo el flujo de datos debe seguir el patrón Inertia:
- Backend: Controladores proveen datos a través de `Inertia::render()`
- Frontend: Componentes reciben datos como props y envían datos con `useForm` o `router`

## Arquitectura Backend (Laravel)

### 1. Controladores

Los controladores siguen el patrón Resource:
- `index()` - Listar recursos
- `create()` - Mostrar formulario de creación (opcional, puede retornar datos para select/dropdowns)
- `store()` - Guardar nuevo recurso
- `show()` - Mostrar recurso específico
- `edit()` - Mostrar formulario de edición (opcional)
- `update()` - Actualizar recurso
- `destroy()` - Eliminar recurso

#### Estructura de método estándar:

```php
use Inertia\Inertia;

public function index(Request $request)
{
    // 1. Obtener y procesar datos
    $items = Model::query()
        ->when($request->search, function ($query, $search) {
            $query->where('name', 'like', "%{$search}%");
        })
        ->paginate(15)
        ->withQueryString();

    // 2. Retornar vista Inertia con datos
    return Inertia::render('Folder/Index', [
        'items' => $items,
        'filters' => $request->only(['search']),
    ]);
}

public function store(Request $request)
{
    // 1. Validar
    $validated = $request->validate([
        'name' => 'required|string|max:255',
        'email' => 'required|email|unique:users',
    ]);

    // 2. Crear recurso
    $item = Model::create($validated);

    // 3. Redirect con mensaje flash (NO JSON)
    return redirect()->route('items.index')
        ->with('success', 'Item creado exitosamente');
}

public function show(Model $item)
{
    // Cargar relaciones si es necesario
    $item->load('relatedModel');
    
    return Inertia::render('Folder/Show', [
        'item' => $item,
        'additional_data' => $someData,
    ]);
}
```

#### ❌ INCORRECTO (No usar):

```php
// NO retornar JSON en métodos que renderizan vistas
return response()->json([
    'status' => 'success',
    'data' => $data
]);

// NO hacer fetch desde el frontend
const response = await fetch('/api/items');
```

#### ✅ CORRECTO:

```php
// Retornar redirect después de POST/PUT/DELETE
return redirect()->route('items.index')
    ->with('success', 'Operación exitosa');

// Retornar vista Inertia para GET
return Inertia::render('Items/Index', ['items' => $items]);
```

### 2. Rutas

Organizar rutas siguiendo convención REST:

```php
Route::middleware(['auth'])->group(function () {
    // Patrón resource completo
    Route::resource('items', ItemController::class);
    
    // O rutas individuales siguiendo el patrón
    Route::get('items', [ItemController::class, 'index'])->name('items.index');
    Route::get('items/create', [ItemController::class, 'create'])->name('items.create');
    Route::post('items', [ItemController::class, 'store'])->name('items.store');
    Route::get('items/{item}', [ItemController::class, 'show'])->name('items.show');
    Route::get('items/{item}/edit', [ItemController::class, 'edit'])->name('items.edit');
    Route::put('items/{item}', [ItemController::class, 'update'])->name('items.update');
    Route::delete('items/{item}', [ItemController::class, 'destroy'])->name('items.destroy');
});
```

**Importante**: Después de cambiar rutas, ejecutar `php artisan wayfinder:generate` para regenerar tipos TypeScript.

## Arquitectura Frontend (React + TypeScript)

### 1. Estructura de Componentes

Usa tipado estricto. Evita `any` y `object` salvo que exista una razón técnica clara y documentada en el propio código.

#### Index (Listado)

```tsx
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { index, show, create } from '@/actions/App/Http/Controllers/Admin/ItemController';

interface Item {
    id: number;
    name: string;
    created_at: string;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedItems {
    data: Item[];
    links: PaginationLink[];
}

interface Props {
    items: PaginatedItems;
    filters: {
        search?: string;
    };
}

export default function ItemsIndex({ items, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');

    const handleSearch = () => {
        router.visit(index().url, {
            data: { search },
            preserveState: true,
        });
    };

    const navigateToItem = (id: number) => {
        router.visit(show({ id }).url);
    };

    const navigateToCreate = () => {
        router.visit(create().url);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Items" />
            
            <Button onClick={navigateToCreate}>Crear Nuevo</Button>

            {items.data.map(item => (
                <div key={item.id} onClick={() => navigateToItem(item.id)}>
                    {item.name}
                </div>
            ))}
        </AppLayout>
    );
}
```

#### Create / Edit (Formularios)

```tsx
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormEventHandler } from 'react';
// Importar acciones de Wayfinder
import { store, update as updateItem } from '@/actions/App/Http/Controllers/Admin/ItemController';

interface Props {
    // Para edit, recibir el item
    item?: {
        id: number;
        name: string;
        email: string;
    };
    // Datos adicionales (select options, etc.)
    categories?: Array<{id: number; name: string}>;
}

export default function ItemCreate({ item, categories }: Props) {
    const { data, setData, post, put, processing, errors } = useForm({
        name: item?.name || '',
        email: item?.email || '',
        category_id: item?.category_id || '',
    });

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();

        if (item) {
            // Actualizar existente - Usar acción de Wayfinder
            put(updateItem({ id: item.id }).url, {
                onSuccess: () => {
                    // Redirect automático desde backend
                },
                onError: () => {
                    // Errors ya están disponibles en `errors`
                }
            });
        } else {
            // Crear nuevo - Usar acción de Wayfinder
            post(store().url, {
                onSuccess: () => {
                    // Redirect automático desde backend
                }
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={item ? 'Editar Item' : 'Crear Item'} />

            <form onSubmit={handleSubmit}>
                <div>
                    <Label htmlFor="name">Nombre</Label>
                    <Input
                        id="name"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        disabled={processing}
                    />
                    {errors.name && <p className="text-red-500">{errors.name}</p>}
                </div>

                <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        disabled={processing}
                    />
                    {errors.email && <p className="text-red-500">{errors.email}</p>}
                </div>

                <Button type="submit" disabled={processing}>
                    {processing ? 'Guardando...' : 'Guardar'}
                </Button>
            </form>
        </AppLayout>
    );
}
```

#### Show (Vista de detalle)

```tsx
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { destroy, edit } from '@/actions/App/Http/Controllers/Admin/ItemController';

interface Item {
    id: number;
    name: string;
    email: string;
    created_at: string;
}

interface Props {
    item: Item;
}

export default function ItemShow({ item }: Props) {
    const handleEdit = () => {
        router.visit(edit({ id: item.id }).url);
    };

    const handleDelete = () => {
        if (confirm('¿Estás seguro?')) {
            router.delete(destroy({ id: item.id }).url);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={item.name} />

            <h1>{item.name}</h1>
            <p>{item.email}</p>

            <Button onClick={handleEdit}>Editar</Button>
            <Button variant="destructive" onClick={handleDelete}>
                Eliminar
            </Button>
        </AppLayout>
    );
}
```

### 2. Navegación y Rutas con Wayfinder

**Usar acciones generadas por Wayfinder en lugar de URLs hardcodeadas:**

Después de ejecutar `php artisan wayfinder:generate`, se generan acciones tipadas en `resources/js/actions/` que corresponden a cada controlador.

```tsx
import { router } from '@inertiajs/react';
// Importar acciones generadas por Wayfinder
import { index, show, store } from '@/actions/App/Http/Controllers/Admin/ItemController';

// ✅ CORRECTO - Usar acciones de Wayfinder
router.visit(index().url);
router.visit(show({ id: 1 }).url);

// ❌ INCORRECTO
const fetchItems = async () => {
    const response = await fetch('/items');
    const data = await response.json();
    setItems(data);
};
```

**Patrón con useForm y Wayfinder:**

```tsx
import { useForm } from '@inertiajs/react';
import { store, update as updateItem } from '@/actions/App/Http/Controllers/Admin/ItemController';

const { data, setData, post, processing } = useForm({
    name: '',
    email: '',
});

// ✅ CORRECTO - Usar acción de Wayfinder con useForm
const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    post(store().url);
};

// Para rutas con parámetros en query string
const createWithParams = (userId: number) => {
    post(store({ query: { user_id: userId } }).url, {
        preserveState: false,
    });
};

// Para rutas con parámetros en path
const submitUpdate = () => {
    put(updateItem({ id: itemId }).url);
};
```

### 3. Formularios con archivos

```tsx
import { store } from '@/actions/App/Http/Controllers/Admin/ItemController';

const { data, setData, post, processing } = useForm({
    name: '',
    image: null as File | null,
});

const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setData('image', file);
    }
};

const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    post(store().url, {
        forceFormData: true, // Importante para archivos
    });
};

return (
    <form onSubmit={handleSubmit}>
        <input type="file" onChange={handleFileChange} />
        <Button type="submit" disabled={processing}>Enviar</Button>
    </form>
);
```

## Checklist de Implementación

### Backend
- [ ] Controlador retorna `Inertia::render()` para vistas GET
- [ ] Métodos POST/PUT/DELETE retornan `redirect()` con mensaje flash
- [ ] NO se usan respuestas JSON en controladores web
- [ ] Rutas siguen patrón REST
- [ ] Se ejecuta `php artisan wayfinder:generate` después de cambiar rutas

### Frontend
- [ ] Componente recibe datos como Props (tipadas con TypeScript)
- [ ] Se usa `useForm` para formularios
- [ ] Se usa `router.visit` para navegación
- [ ] NO se usa `fetch`, `axios` ni requests HTTP manuales
- [ ] Errores se muestran desde `errors` de `useForm`
- [ ] Estado de carga se maneja con `processing` de `useForm`
- [ ] Se usa el layout correcto para la sección: normalmente `AppLayout`, y layouts específicos cuando esa sección ya los tenga

## Errores Comunes a Evitar

### ❌ No hacer:

```tsx
// 1. NO usar fetch
const loadUsers = async () => {
    const response = await fetch('/api/users');
    const data = await response.json();
    setUsers(data);
};

// 2. NO crear estado para datos que vienen de props
const [items, setItems] = useState<Item[]>([]);
useEffect(() => {
    loadItems(); // NO
}, []);

// 3. NO crear FormData manualmente
const formData = new FormData();
formData.append('name', name);
await fetch('/items', { method: 'POST', body: formData });

// 4. NO usar rutas hardcodeadas sin tipo
router.visit('/items/create');
```

### ✅ Hacer en su lugar:

```tsx
// 1. Recibir datos como props
interface Props {
    users: User[];
}
export default function Component({ users }: Props) {
    // users ya disponibles
}

// 2. Usar useForm para formularios
import { store } from '@/actions/App/Http/Controllers/Admin/ItemController';

const { data, setData, post, processing } = useForm({
    name: '',
});

// 3. Enviar formulario con acción de Wayfinder
const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    post(store().url, {
        onSuccess: () => {
            // Redirect automático desde backend
        }
    });
};

// 4. Navegar con router usando acciones de Wayfinder
import { index, create } from '@/actions/App/Http/Controllers/Admin/ItemController';

router.visit(create().url);
```

## Resumen Visual del Flujo

```
┌─────────────────────────────────────────────────────────┐
│                      FLUJO INERTIA                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  GET /items                                             │
│  ───────────────────>  ItemController::index()          │
│                        ├── Query database               │
│                        └── Inertia::render('Items/Index')│
│  <───────────────────  return props {items, filters}    │
│  Component renders                                      │
│                                                         │
│  POST /items (useForm)                                  │
│  ───────────────────>  ItemController::store()          │
│                        ├── Validate request             │
│                        ├── Create item                  │
│                        └── redirect()->route('items.index')│
│  <───────────────────  redirect                         │
│  Navigate to index                                      │
│                                                         │
│  router.visit(show({ id: 1 }).url)                      │
│  ───────────────────>  ItemController::show($item)      │
│                        └── Inertia::render('Items/Show')│
│  <───────────────────  return props {item}              │
│  Component renders                                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Ejemplos Completos de Referencia

Para ver ejemplos completos y funcionales, revisar:
- Frontend: `resources/js/pages/settings/` y `resources/js/pages/users/`
- Layouts: `resources/js/layouts/app-layout.tsx` y `resources/js/layouts/settings/layout.tsx`
- Rutas backend: `routes/web.php` y `routes/settings.php`
- Backend: `app/Http/Controllers/Admin/UserController.php`
- Frontend: `resources/js/pages/users/` (index.tsx, create.tsx, show.tsx)
- Rutas: `routes/web.php` (sección de users)

## Wayfinder: Sistema de Rutas Tipadas

### Generación de Acciones

Después de modificar rutas en `routes/web.php`, ejecutar:

```bash
php artisan wayfinder:generate
```

Esto genera archivos TypeScript en:
- `resources/js/actions/App/Http/Controllers/` - Acciones por controlador
- `resources/js/routes/` - Helpers de rutas

### Uso de Acciones en Componentes

```tsx
// Importar desde actions (recomendado)
import { index, show, store, update, destroy } from '@/actions/App/Http/Controllers/Admin/ItemController';

// GET - Navegar a index
router.visit(index().url);

// GET - Navegar a show con parámetro
router.visit(show({ id: 123 }).url);

// POST - Crear con useForm
const { post } = useForm({ name: '', email: '' });
post(store().url);

// POST - Con parámetros en query string
post(store({ query: { user_id: 456 } }).url, {
    preserveState: false,
});

// PUT - Actualizar
const { put } = useForm({ name: 'Updated' });
put(update({ id: 123 }).url);

// DELETE - Eliminar
router.delete(destroy({ id: 123 }).url);
```

### Parámetros de Ruta

**Parámetros en Path (requeridos):**
```tsx
// Ruta: /items/{id}
show({ id: 123 }).url  // → /items/123
```

**Parámetros en Query String (opcionales):**
```tsx
// Ruta: /items
index({ query: { search: 'test', page: 2 } }).url  // → /items?search=test&page=2
```

**Combinados:**
```tsx
// Ruta: /items/{id}
show({ id: 123, query: { tab: 'details' } }).url  // → /items/123?tab=details
```

### Ejemplo Completo con Wayfinder

```tsx
import { Head, useForm, router } from '@inertiajs/react';
import { index, store } from '@/actions/App/Http/Controllers/ChatController';

export default function ChatCreate({ users }: Props) {
    const { post, processing } = useForm({});

    const startConversation = (userId: number) => {
        // Usar acción generada con parámetros
        post(store({ query: { user_id: userId } }).url, {
            preserveState: false,
        });
    };

    const goBack = () => {
        // Navegar usando acción generada
        router.visit(index().url);
    };

    return (
        <div>
            <button onClick={goBack}>Volver</button>
            {users.map(user => (
                <button 
                    key={user.id}
                    onClick={() => startConversation(user.id)}
                    disabled={processing}
                >
                    {user.name}
                </button>
            ))}
        </div>
    );
}
```

## Notas Adicionales

- **Broadcasting/WebSockets**: Casos especiales como chat en tiempo real pueden escuchar eventos con `window.Echo`, pero el envío de mensajes DEBE seguir usando `useForm.post()`
- **API externa**: Si necesitas consumir APIs de terceros (no tu backend Laravel), usa `fetch` pero solo para servicios externos
- **Paginación**: Los datos paginados vienen automáticamente con `links` y `meta`, usar componente `Pagination` existente
- **Flash Messages**: Se acceden desde `usePage().props.flash` en el frontend
- **Wayfinder**: SIEMPRE ejecutar `php artisan wayfinder:generate` después de cambiar rutas

---

**Regla de oro**: Si estás escribiendo `fetch(` o `axios.` en un componente de Inertia, probablemente lo estás haciendo mal. Usa `router.visit` o `useForm` con acciones de Wayfinder.
