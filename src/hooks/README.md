# Hooks de datos — patrón a seguir para migrar el resto de pantallas

Hallazgo de la auditoría: el patrón `useState + useEffect + base44.functions.invoke(...)`
está duplicado en ~65 archivos de `src/pages/` y `src/components/`. `react-query` ya
está instalado y `QueryClientProvider` ya envuelve la app (`src/App.jsx`), pero no se
usaba. `Hoy.jsx` y `AliadaInicio.jsx` ya están migrados como referencia — cópialos.

## 1. Reemplazar el patrón de invocación de funciones

**Antes:**
```jsx
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  base44.functions.invoke("getAliadaDashboard", {})
    .then((res) => setData(res.data))
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false));
}, []);
```

**Después:**
```jsx
import { useBase44Query } from "@/hooks/useBase44Query";

const { data, isLoading, error } = useBase44Query("getAliadaDashboard", {});
```

- `data` llega ya como `res.data` (no hace falta desenvolver la respuesta).
- `error` es el error lanzado por `base44.functions.invoke` — si necesitas el
  cuerpo JSON de un error 4xx/5xx del backend, sigue estando en
  `error.response?.data?.error` (revisa cómo lo maneja `AliadaInicio.jsx`).
- Los parámetros (segundo argumento) forman parte de la `queryKey` — si cambian,
  react-query vuelve a pedir los datos automáticamente. No necesitas un `useEffect`
  con esos parámetros como dependencia.
- Para recargar manualmente después de una acción (ej. tras un check-in), usa el
  `refetch` que devuelve el hook, en vez de volver a llamar a `load()` a mano
  (ver `Hoy.jsx`).

Para escritura (`create`/`update`/acciones), usa `useBase44Mutation`:
```jsx
import { useBase44Mutation } from "@/hooks/useBase44Mutation";

const { mutateAsync, isPending } = useBase44Mutation("registerSale");
await mutateAsync(formValues); // lanza si el backend responde error
```

## 2. Reemplazar `base44.auth.me()` por `useAuth()`

`auth.me()` se invocaba de forma independiente en cada pantalla en vez de leerse de
`AuthContext` (`src/lib/AuthContext.jsx`), que ya lo resuelve una sola vez al cargar
la app y lo expone vía `useAuth()`.

**Antes:**
```jsx
useEffect(() => {
  (async () => {
    const me = await base44.auth.me();
    setClientaId(me.id);
    // ...
  })();
}, []);
```

**Después:**
```jsx
import { useAuth } from "@/lib/AuthContext";

const { user } = useAuth();
const clientaId = user?.id || null;
```

- Todas las pantallas migradas viven dentro de `<ProtectedRoute>`, así que cuando el
  componente se monta, `AuthContext` ya resolvió `user` — no hace falta volver a
  pedirlo.
- Si una función backend necesita el `clientaId`/`user.id` como parámetro, pásalo a
  `useBase44Query`/`useBase44Mutation` y usa `enabled: !!clientaId` para no disparar
  la petición antes de tener el dato (ver `Hoy.jsx`).
- La única llamada legítima a `base44.auth.me()` fuera de `AuthContext.jsx` es
  dentro del propio `AuthContext` — no lo dupliques en ningún otro archivo.

## 3. Separar lógica de negocio del componente

Si una pantalla mezcla lógica de negocio (agrupar/transformar datos, armar mensajes,
calcular estados) con el JSX, extrae esa lógica a una función pura en un archivo
aparte (ver `src/pages/aliada/aliadaAlertGroups.js`, extraído de `AliadaInicio.jsx`).
El componente solo debe: pedir datos con el hook, llamar a la función de
transformación, y renderizar el resultado. Esto hace la lógica testeable sin
necesidad de montar el componente.

## 4. Orden sugerido para migrar el resto de los ~65 archivos

1. Pantallas de mayor tráfico primero (ya hecho: `Hoy.jsx`, `AliadaInicio.jsx`).
2. El resto de `src/pages/aliada/*` y `src/pages/clienta/*` (comparten los mismos
   hooks de backend que las dos ya migradas).
3. `src/pages/admin/*` — más pantallas, pero cada una es independiente; migrar de
   una en una sin bloquear el resto.
4. Los 21 archivos que aún llaman `base44.auth.me()` directo fuera de
   `AuthContext.jsx` — reemplazar por `useAuth()` aunque la pantalla no se migre a
   `useBase44Query` todavía (son cambios independientes).

No migres todo de una sola vez: cada archivo es un cambio pequeño y revisable por
separado, consistente con que hoy no hay ambiente de staging (ver Fase 7).
