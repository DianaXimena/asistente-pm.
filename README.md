# Asistente PM

Aplicación web (Next.js, lista para Vercel) que guía al Project Manager paso a paso por las fases
Inicio → Planificación → Ejecución → Control → Cierre.

## Desarrollo

```bash
npm install
npm run dev
```

## Acceso con usuarios

Toda la app (páginas y API) exige iniciar sesión. Los usuarios viven en Neon (Postgres):

- Claves guardadas solo como hash (bcrypt), bloqueo de 15 minutos tras 5 intentos fallidos.
- Cambio de clave obligatorio en el primer ingreso; política: 10+ caracteres con letras, números y un símbolo.
- Sesión firmada en cookie `httpOnly` (8 h), invalidada al desactivar al usuario o restablecer su clave.
- `/usuarios` (solo administradores): crear usuarios con clave temporal, activar/desactivar, cambiar rol y restablecer clave.
- Bitácora de accesos `auth_audit` de solo inserción (un trigger impide editar o borrar).

Variables de entorno en Vercel:

| Variable | Uso |
|---|---|
| `DATABASE_URL` | La agrega Vercel al conectar la base Neon |
| `AUTH_SECRET` | Texto aleatorio de 32+ caracteres para firmar sesiones |
| `INITIAL_USERS` | Correos de los administradores iniciales, separados por coma |
| `INITIAL_PASSWORD` | Clave temporal inicial (deben cambiarla al primer ingreso) |

Las tablas se crean solas en el primer acceso; los usuarios iniciales solo se crean si la tabla está vacía.

### Proyectos en la base

- Cada proyecto se guarda en `projects` con su dueño; un Project Manager ve los suyos y un administrador ve todos.
- Guardado automático con control de versiones: si otra persona cambió el proyecto, se carga la versión más reciente y se avisa.
- La bitácora de auditoría oficial vive en `project_audit` (solo inserción, protegida por trigger); la API rechaza
  cualquier cambio sobre entradas ya registradas y guarda quién y cuándo las recibió.
- Eliminar un proyecto es una baja lógica: deja de mostrarse y su bitácora se conserva.
- Los proyectos que existían solo en el navegador se suben con el botón "Subir a la base" del portafolio.

## Portafolio

- **`/` Portafolio**: botón "Nuevo Proyecto" (captura de cliente y proyecto), total de proyectos en curso y una
  tarjeta por proyecto con enfoque (Predictivo, Adaptativo (Ágil) o Híbrido), avance del ciclo de vida y
  comparación del avance real (EV) frente a lo planificado (PV) de la línea base de medición del desempeño.
- **`/proyecto` Detalle**: los cinco grupos de procesos (Iniciación, Planificación, Ejecución, Monitoreo y
  Control, Cierre) con tooltips PMP. En Monitoreo y Control: cronograma, presupuesto, utilización de recursos
  y curva S (PV, EV y AC acumulados).

## Repositorio de Plantillas (CMMI / PMP)

`/repositorio`: catálogo de 13 plantillas con tipo de proyecto, grupo de procesos (tooltips PMP), propósito y
enlace directo "Abrir en Google Docs" (más "Hacer una copia"). No genera documentos bajo demanda.

**Carga inicial (una sola vez):** un administrador hace clic en "Inicializar repositorio"; `/api/templates/seed`
llama a Google Apps Script (`google-apps-script/`), que crea cada plantilla en la carpeta madre, y la URL queda en
la tabla `template_documents`. Es idempotente: si se repite, no duplica. Variables: `GOOGLE_APPS_SCRIPT_URL` y
`GOOGLE_APPS_SCRIPT_TOKEN`.
Guía de instalación: [`google-apps-script/README.md`](./google-apps-script/README.md).

## Flujo actual

1. **Nuevo proyecto** (botón en el portafolio): nombre del cliente y del proyecto.
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

## Cumplimiento de auditoría (6 hallazgos)

1. **Trazabilidad (RTM bidireccional)** — `/cuestionario/matriz-trazabilidad`: requisitos `RTM-REQ-###` con origen,
   objetivo de negocio, prioridad, criterio de aceptación y carácter regulatorio. Vínculo requisito → paquete de
   trabajo y paquete → requisito → objetivo. Solo se aprueba sin requisitos sin cubrir ni trabajo no solicitado.
2. **Integridad de datos** — sellos de tiempo del sistema en cada aprobación, bitácora solo-agregar con huellas
   encadenadas (`/auditoria`, exportable a JSON), fechas no futuras ni anteriores al evento que las habilita y
   líneas base congeladas tras aprobarse (solo cambian por Solicitud de Cambio). Mientras los datos estén en el
   navegador, la bitácora detecta alteraciones; la inmutabilidad real requiere un servidor.
3. **Gobernanza** — costo como % del BAC: tolerancia operativa (5%) y umbral de escalamiento (10%), configurables.
   Aplica a Solicitudes de Cambio y al CV% del informe EVM. El cronograma conserva el límite en días del PM.
4. **Regulatorio y legal** — escalamiento obligatorio, sin alternativas, sin rechazo ni diferimiento del CCB y
   ajuste de línea base obligatorio. Los requisitos regulatorios no se eliminan.
5. **Verificado vs. aceptado** — la aceptación exige verificación de Control de Calidad previa, fecha posterior a
   ella, validación del criterio de cada requisito trazado (`rtm_id_link`) y queda sellada e inmutable.
6. **Conocimiento** — cada lección se clasifica como explícita (repositorio OPA) o tácita (quién la posee, quién la
   recibe, método y fecha de transferencia).

## Estructura

- `lib/types.ts` — modelo de datos.
- `lib/approach.ts` — algoritmo de detección de enfoque.
- `lib/acta.ts`, `lib/stakeholders.ts`, `lib/planning.ts`, `lib/execution.ts`, `lib/control.ts`, `lib/closure.ts`, `lib/rtm.ts`, `lib/governance.ts` — validaciones y reglas de cada cuestionario.
- `lib/assistant.ts` — motor del asistente: mensaje, acción sugerida y alertas proactivas.
- `lib/audit.ts`, `lib/locks.ts`, `lib/audit-report.ts` — bitácora encadenada, bloqueos y exportación de auditoría.
- `lib/store.tsx` — estado del proyecto y recálculo de progreso (guardado provisional en el navegador).
- `components/` — Dashboard, stepper de fases, tarjeta del Asistente y pantallas de cada flujo.

Moneda: dólares (USD). Progreso global: cada fase pesa 20%.

## Despliegue en Vercel

Importar el repositorio en Vercel; detecta Next.js automáticamente sin configuración adicional.
