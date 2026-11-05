# Asistente PM

Aplicación web (Next.js, lista para Vercel) que guía al Project Manager paso a paso por las fases
Inicio → Planificación → Ejecución → Control → Cierre.

## Desarrollo

```bash
npm install
npm run dev
```

## Estructura

- `lib/types.ts` — modelo de datos (basado en el JSON del documento de diseño).
- `lib/mock-project.ts` — proyecto de demostración (fase Inicio, 10%).
- `lib/assistant.ts` — motor del asistente: lee los estados y genera el mensaje y la acción sugerida.
- `components/` — Dashboard, stepper lateral de fases, tarjeta del Asistente, checklist con semáforo.
- `lib/acta.ts` — validaciones del Acta y cálculo de Inicio (70% Acta + 30% interesados).
- `lib/store.tsx` — estado del proyecto (guardado provisional en el navegador).
- `app/cuestionario/acta-constitucion` — cuestionario del Acta (4 pasos + resumen).
- `app/cuestionario/[id]` — Riesgos y Solicitud de Cambio (en construcción).

## Despliegue en Vercel

Importar el repositorio en Vercel; detecta Next.js automáticamente sin configuración adicional.
