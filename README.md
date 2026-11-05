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
5. **Ejecución**: Registro de Lecciones Aprendidas (vivo), Asignación de Recursos (equipo + matriz RACI) e
   Informe de Desempeño mensual (PV/EV sugeridos desde las líneas base, CPI, SPI, EAC, VAC, semáforo y
   distribución Push/Pull). Tablero de Ejecución (`/ejecucion`): avance de paquetes con verificación de
   calidad, bloqueo de tareas si falta el informe del mes anterior y tablero de impedimentos con escala de
   intervención de 4 niveles. Progreso = (% paquetes en ejecución + % entregables completados) / 2.
6. **Control**: Registro mensual de CPI/SPI (informe al día), Registro de Incidentes (conversión riesgo → incidente,
   uso de reserva de contingencia y Solicitud de Cambio automática si el plan no fue suficiente) y Registro de
   Cambios con la escalera de 9 peldaños (solicitud escrita, impacto en 7 dimensiones, alternativas, decisión
   PM o CCB según la autoridad delegada, regla regulatoria). Un cambio aprobado que modifica líneas base
   retrocede el proyecto a Planificación (Replanificación) y bloquea la ejecución hasta volver a aprobar el plan.
   Progreso = (EVM al día + % incidentes atendidos) / 2.
7. **Cierre**: Aceptación formal del cliente solo sobre entregables verificados por Calidad (con transición a
   operaciones), Cierre de contratos y administrativo, y Archivo de lecciones como OPA (explícito y tácito).
   Progreso = (entregables aceptados + contratos cerrados + lecciones archivadas) / 3. Compuerta final
   "Celebrar y Cerrar Proyecto".
8. **Herramientas**: Actas de reunión (con la sugerencia proactiva de generar acta) y Evaluación de
   Disposición al Cambio (4 factores).
9. **Compuertas de fase**: con todos los insumos aprobados, el asistente habilita el avance a la siguiente fase.

Cada cuestionario puede **omitirse solo si se adjunta el documento** correspondiente.

## Estructura

- `lib/types.ts` — modelo de datos.
- `lib/approach.ts` — algoritmo de detección de enfoque.
- `lib/acta.ts`, `lib/stakeholders.ts`, `lib/planning.ts`, `lib/execution.ts`, `lib/control.ts`, `lib/closure.ts` — validaciones y reglas de cada cuestionario.
- `lib/assistant.ts` — motor del asistente: mensaje, acción sugerida y alertas proactivas.
- `lib/store.tsx` — estado del proyecto y recálculo de progreso (guardado provisional en el navegador).
- `components/` — Dashboard, stepper de fases, tarjeta del Asistente y pantallas de cada flujo.

Moneda: dólares (USD). Progreso global: cada fase pesa 20%.

## Despliegue en Vercel

Importar el repositorio en Vercel; detecta Next.js automáticamente sin configuración adicional.
