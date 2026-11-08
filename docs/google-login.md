# Activar el inicio de sesión con Google

La app ya tiene el botón "Continuar con Google" y la ruta `/auth/callback`. Falta activarlo en Supabase y Google (lo hace Lucy, una sola vez; Claude no puede).

## 1. Google Cloud (credenciales OAuth)

1. Entra a console.cloud.google.com con tu cuenta de Google y crea un proyecto (por ejemplo `tuli`).
2. **APIs y servicios → Pantalla de consentimiento de OAuth**: tipo **Externo**, nombre de la app `Tuli`, tu correo de soporte. Agrega tu correo como **usuario de prueba** (mientras la app esté en "Prueba" solo entran los usuarios de prueba).
3. **Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web**.
4. En **URIs de redireccionamiento autorizados** pega exactamente:
   `https://ngtcqkwjnacazgzjeikl.supabase.co/auth/v1/callback`
5. Copia el **ID de cliente** y el **Secreto del cliente**.

## 2. Supabase

1. **Authentication → Sign In / Providers → Google**: actívalo y pega el ID y el secreto.
2. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback` (después agrega la URL de Vercel con `/auth/callback`).

## 3. Probar

1. `npm run dev` en `apps/web` y entra a `http://localhost:3000/login` → "Continuar con Google".
2. La primera vez no verás niños: la cuenta nueva no está vinculada a nadie. Desde `tools/simulator`:
   - `npm run link -- tucorreo@gmail.com guardian` (tutor de "Alumno A")
   - `npm run link -- tucorreo@gmail.com teacher` (docente del "Salón demo")
3. Recarga el dashboard.

## Notas

- El rol del perfil no da acceso a nada por sí solo; el acceso viene de `guardians` y `teacher_classrooms` (ver migración `esquema_inicial`).
- El formulario de "Cuentas de demostración" del login (correo y contraseña) es solo para `padre1@tuli.test`, `padre2@tuli.test` y `docente@tuli.test`. Quitarlo antes de producción real.
- Pendiente: flujo de invitación dentro de la app para vincular tutores y docentes sin usar `npm run link`.
