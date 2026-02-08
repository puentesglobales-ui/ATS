# Guía de Configuración: Google Login para Supabase

Para que el botón "Continuar con Google" funcione, necesitas configurar las credenciales en Google Cloud y conectarlas a tu proyecto de Supabase.

## Paso 1: Configurar Google Cloud Console

1.  Ve a [Google Cloud Console](https://console.cloud.google.com/).
2.  Crea un **Nuevo Proyecto** (nómbralo "Puentes Globales ATS" o similar).
3.  En el menú lateral, ve a **APIs y Servicios** > **Pantalla de consentimiento de OAuth**.
    *   Selecciona **Externo**.
    *   Llena los datos obligatorios (Nombre de la App, Correo de soporte).
    *   En "Dominios autorizados", agrega el dominio de tu Supabase (ej: `loremipsum.supabase.co`) y tu dominio de producción si tienes uno.
    *   Guarda y continua (puedes saltar los "Scopes" por ahora si solo necesitas email/perfil).
4.  Ve a **Credenciales** en el menú lateral.
    *   Haz clic en **Crear Credenciales** > **ID de cliente de OAuth**.
    *   Tipo de aplicación: **Aplicación web**.
    *   **Orígenes autorizados de JavaScript:**
        *   `http://localhost:5173` (Para pruebas locales)
        *   `https://ats-career-client.vercel.app` (Tu frontend en producción)
    *   **URI de redireccionamiento autorizados:**
        *   Necesitas la URL de callback de Supabase.
        *   Ve a tu Dashboard de Supabase -> Authentication -> Providers -> Google -> **Callback URL (for OAuth)**. Copia esa URL.
        *   Pégala en Google Cloud Console.
    *   Haz clic en **Crear**.

**¡Importante!** Copia el **ID de Cliente** y el **Secreto de Cliente** que te dará Google.

## Paso 2: Configurar Supabase

1.  Ve a tu [Dashboard de Supabase](https://supabase.com/dashboard).
2.  Entra a tu proyecto.
3.  En el menú lateral, ve a **Authentication** > **Providers**.
4.  Busca **Google** y habilítalo.
5.  Pega el **Client ID** y **Client Secret** que obtuviste en el paso anterior.
6.  Haz clic en **Save**.

## Paso 3: Verificación Técnica

Una vez guardado:
1.  Reinicia o recarga tu aplicación local (`http://localhost:5173`).
2.  Intenta hacer clic en "Continuar con Google".
3.  Debería abrirse la ventana emergente de Google.

### Notas sobre Producción
Recuerda que si despliegas el backend/frontend en nuevos dominios (ej: Vercel, Render), debes agregarlos siempre a la lista de **Orígenes autorizados** en la consola de Google Cloud para evitar errores de bloqueos CORS.
