# Integración con Google Drive (Apps Script)

El botón **"Generar en Google Docs"** del Repositorio de Plantillas llama a la app (`/api/drive/generate`),
que reenvía la petición a este script de Google Apps Script. El script:

1. Busca (o crea) la subcarpeta del tipo de proyecto (`Predictivo`, `Ágil`, `Híbrido`, `General`) dentro de la
   carpeta madre `1ZoHiDJTooOMsiOYM_2smklcSgAYyprhh`.
2. Si el documento ya existe en esa subcarpeta, devuelve su enlace (no duplica).
3. Si no existe, crea el Google Doc con encabezado (cliente, proyecto y fecha), confidencialidad, control de
   versiones con "¿Es Línea Base? (Sí/No)", instrucciones de llenado en cada sección, tablas y aprobaciones.

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
3. Revisa en la carpeta madre que se creó la subcarpeta `General` con el documento "Prueba — Acta de Reunión".
   Puedes borrarlo después.

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
4. Abre la app → **Plantillas CMMI / PMP**: el aviso de "no configurada" desaparece y los botones se activan.

## Si cambias el script

Después de editar `Code.gs`: **Implementar** → **Administrar implementaciones** → lápiz → **Versión: Nueva versión** → **Implementar**.
La URL no cambia.

## Problemas frecuentes

| Mensaje en la app | Causa | Solución |
|---|---|---|
| La integración con Google Drive no está configurada | Faltan las variables en Vercel | Paso 5 y **Redeploy** |
| El token del servidor no coincide | `API_TOKEN` distinto en Apps Script y Vercel | Usa exactamente la misma clave |
| No se pudo contactar a Google Apps Script | URL incorrecta o implementación con acceso restringido | Revisa el paso 4 |
| No se pudo generar el documento (…) | Permisos sobre la carpeta madre | La cuenta que publica debe poder editar la carpeta |
