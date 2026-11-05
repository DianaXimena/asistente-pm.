# Integración con Google Drive (Apps Script)

El script se usa **una sola vez**, en la **carga inicial** del Repositorio de Plantillas. Un administrador
abre **Plantillas CMMI / PMP** en la app y hace clic en **Inicializar repositorio**; la app llama a
`/api/templates/seed` por cada plantilla y este script:

1. Crea el Google Doc **directamente en la carpeta madre** `1ZoHiDJTooOMsiOYM_2smklcSgAYyprhh`, con encabezado
   para completar (`[Nombre del cliente]`, `[Nombre del proyecto]`, `[dd/mm/aaaa]`), confidencialidad, control de
   versiones con "¿Es Línea Base? (Sí/No)", instrucciones de llenado en cada sección, tablas y aprobaciones.
2. Si el documento ya existe en la carpeta madre, devuelve su enlace (no duplica).

La app guarda cada enlace en la base de datos (`template_documents`). Desde ahí, la pantalla solo **abre** los
documentos: ya no genera nada. Para usar una plantilla en un proyecto, cada usuario hace "Hacer una copia".

**Acceso de los usuarios:** los documentos heredan los permisos de la carpeta madre. Compártela (al menos como
Lector) con los usuarios de la app, o configúrala como "Cualquier persona con el enlace: Lector".

Los documentos quedan a nombre de la cuenta que publica el script; esa cuenta necesita acceso de edición a la carpeta madre.

## Paso 1 · Crear el script

1. Entra a <https://script.google.com> con la cuenta que tiene acceso a la carpeta madre.
2. Haz clic en **Nuevo proyecto** y ponle de nombre `Asistente PM · Plantillas`.
3. Borra el contenido de `Código.gs` y pega todo el archivo [`Code.gs`](./Code.gs).
4. En **Configuración del proyecto** (ícono de engranaje), activa **Mostrar el archivo de manifiesto "appsscript.json"**.
   Vuelve al editor, abre `appsscript.json` y reemplázalo por [`appsscript.json`](./appsscript.json).
5. Haz clic en **Guardar**.

## Paso 2 · Crear el token secreto

1. Inventa una clave larga y difícil (por ejemplo, 40 caracteres entre letras y números). No la compartas.
2. En **Configuración del proyecto** → **Propiedades del script** → **Agregar propiedad del script**:
   - Propiedad: `API_TOKEN`
   - Valor: tu clave
3. Haz clic en **Guardar propiedades del script**.

## Paso 3 · Probar y autorizar

1. En el editor, elige la función `testGenerate` y haz clic en **Ejecutar**.
2. Google pedirá permisos: **Revisar permisos** → elige tu cuenta → **Permitir**.
3. Revisa en la carpeta madre que se creó el documento "Prueba — Acta de Reunión". Bórralo después.

## Paso 4 · Publicar como aplicación web

1. Haz clic en **Implementar** → **Nueva implementación**.
2. En el engranaje de "Seleccionar tipo", elige **Aplicación web**.
3. Configura:
   - **Ejecutar como:** Yo.
   - **Quién tiene acceso:** Cualquier persona. (El token es la protección.)
4. Haz clic en **Implementar** y copia la **URL de la aplicación web** (termina en `/exec`).

## Paso 5 · Conectar la app en Vercel

1. En Vercel abre tu proyecto → **Settings** → **Environment Variables**.
2. Agrega dos variables (entorno **Production**, y también **Preview** si lo usas):
   - `GOOGLE_APPS_SCRIPT_URL` = la URL del paso 4
   - `GOOGLE_APPS_SCRIPT_TOKEN` = la misma clave del paso 2
3. Ve a **Deployments**, abre el último y elige **Redeploy** para que tome las variables.
4. Ingresa a la app como administrador → **Plantillas CMMI / PMP** → **Inicializar repositorio**.
   Al terminar, las 13 plantillas muestran "Abrir en Google Docs" para todos los usuarios.

## Si cambias el script

Después de editar `Code.gs`: **Implementar** → **Administrar implementaciones** → lápiz → **Versión: Nueva versión** → **Implementar**.
La URL no cambia.

## Problemas frecuentes

| Mensaje en la app | Causa | Solución |
|---|---|---|
| Falta configurar GOOGLE_APPS_SCRIPT_URL… | Faltan las variables en Vercel | Paso 5 y **Redeploy** |
| unauthorized | `API_TOKEN` distinto en Apps Script y Vercel | Usa exactamente la misma clave |
| drive_unreachable | URL incorrecta o implementación restringida | Revisa el paso 4 |
| Un usuario no puede abrir un documento | La carpeta madre no está compartida con él | Comparte la carpeta madre |

Si la carga inicial falla en alguna plantilla, vuelve a hacer clic en **Inicializar repositorio**: solo se crean
las que faltan.
