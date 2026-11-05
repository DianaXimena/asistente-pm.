# Asistente PM

Aplicación web (Next.js, lista para Vercel) que guía al Project Manager paso a paso por las fases
Inicio → Planificación → Ejecución → Control → Cierre.

## Desarrollo

```bash
npm install
npm run dev
```

## Flujo actual

1. **Nuevo proyecto** (`/nuevo`): nombre del cliente y del proyecto.
2. **Primer insumo** (`/nuevo/insumo`): se carga el documento inicial y se detecta el enfoque
   (Predictivo, Ágil o Híbrido); si no hay certeza, micro-evaluador de 2 preguntas.
3. **Inicio**: Acta de Constitución (4 pasos) y Registro de Interesados (identificación,
   Poder vs. Interés, involucramiento actual vs. deseado). Progreso = 70% Acta + 30% Interesados.
4. **Planificación (guía PMP)**: Línea Base del Alcance (enunciado + EDT + Diccionario) → Cronograma
   (estimación única o PERT, dependencias, ruta crítica) → Registro de Riesgos (EMV y dueño obligatorio) →
   Línea Base de Costos (estimaciones + contingencia + reserva de gestión).
5. **Compuertas de fase**: con todos los insumos aprobados, el asistente habilita el avance a la siguiente fase.

Cada cuestionario puede **omitirse solo si se adjunta el documento** correspondiente.

## Estructura

- `lib/types.ts` — modelo de datos.
- `lib/approach.ts` — algoritmo de detección de enfoque.
- `lib/acta.ts`, `lib/stakeholders.ts`, `lib/planning.ts` — validaciones y reglas de cada cuestionario.
- `lib/assistant.ts` — motor del asistente: mensaje, acción sugerida y alertas proactivas.
- `lib/store.tsx` — estado del proyecto y recálculo de progreso (guardado provisional en el navegador).
- `components/` — Dashboard, stepper de fases, tarjeta del Asistente y pantallas de cada flujo.

Moneda: dólares (USD). Progreso global: cada fase pesa 20%.

## Despliegue en Vercel

Importar el repositorio en Vercel; detecta Next.js automáticamente sin configuración adicional.
