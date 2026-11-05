import type { ApproachType, PhaseId } from "./types";

// Catálogo de 13 plantillas estándar (CMMI / PMP). Fuente única para la tabla del
// Repositorio y para la estructura que Google Apps Script genera en Google Docs.

export type TemplateType = "Predictivo" | "Ágil" | "Híbrido" | "General";

export interface TemplateTable {
  headers: string[];
  /** Filas vacías para completar. */
  rows: number;
  /** Valores fijos de la primera columna (una fila por valor). */
  firstColumn?: string[];
}

export interface TemplateSection {
  title: string;
  /** Texto instructivo (se inserta en cursiva gris como placeholder). */
  instruction: string;
  table?: TemplateTable;
  subsections?: { title: string; instruction: string; table?: TemplateTable }[];
}

export interface DocTemplate {
  id: string;
  name: string;
  types: TemplateType[];
  phases: PhaseId[];
  purpose: string;
  sections: TemplateSection[];
}

/** ID de la carpeta madre en Google Drive (definida en el requerimiento). */
export const DRIVE_ROOT_FOLDER_ID = "1ZoHiDJTooOMsiOYM_2smklcSgAYyprhh";

export const PHASE_SHORT: Record<PhaseId, string> = {
  inicio: "Iniciación",
  planificacion: "Planificación",
  ejecucion: "Ejecución",
  control: "Monitoreo y Control",
  cierre: "Cierre",
};

const I = (t: string) => `[Instrucción: ${t}]`;

export const TEMPLATES: DocTemplate[] = [
  {
    id: "acta-constitucion",
    name: "Acta de Constitución",
    types: ["Predictivo"],
    phases: ["inicio"],
    purpose: "Autorizar formalmente el proyecto, definir alcance, riesgos y presupuesto a alto nivel.",
    sections: [
      { title: "Propósito y caso de negocio", instruction: I("Describa el problema u oportunidad que origina el proyecto y el beneficio esperado para la organización. Referencie el caso de negocio aprobado.") },
      {
        title: "Objetivos medibles y criterios de éxito",
        instruction: I("Inserte aquí los objetivos de negocio medibles. Asegúrese de que sean SMART y estén alineados a la estrategia organizacional."),
        table: { headers: ["Objetivo", "Indicador", "Meta", "Fecha"], rows: 3 },
      },
      { title: "Descripción y requisitos de alto nivel", instruction: I("Resuma el producto, servicio o resultado y los requisitos principales. El detalle se elaborará en la Planificación.") },
      { title: "Alcance de alto nivel y exclusiones", instruction: I("Indique qué incluye el proyecto y qué queda explícitamente fuera, para evitar la corrupción del alcance.") },
      {
        title: "Riesgos de alto nivel",
        instruction: I("Liste los riesgos iniciales conocidos (amenazas y oportunidades). Se detallarán en el Registro de Riesgos."),
        table: { headers: ["Riesgo", "Tipo (Amenaza/Oportunidad)", "Impacto"], rows: 3 },
      },
      {
        title: "Resumen de hitos",
        instruction: I("Registre los hitos principales y su fecha objetivo."),
        table: { headers: ["Hito", "Fecha objetivo", "Criterio de cumplimiento"], rows: 4 },
      },
      { title: "Presupuesto resumido", instruction: I("Indique el presupuesto límite aprobado (USD) y su fuente de financiamiento.") },
      {
        title: "Interesados clave",
        instruction: I("Liste a los interesados principales y su rol. El análisis completo va en el Registro de Interesados."),
        table: { headers: ["Interesado", "Rol", "Organización"], rows: 3 },
      },
      { title: "Director del proyecto y nivel de autoridad", instruction: I("Nombre al director del proyecto y detalle su autoridad sobre recursos, presupuesto, decisiones técnicas y resolución de conflictos.") },
      { title: "Requisitos de aprobación y criterios de salida", instruction: I("Defina qué constituye el éxito del proyecto, quién lo decide y las condiciones para cerrar o cancelar el proyecto.") },
    ],
  },
  {
    id: "registro-interesados",
    name: "Registro de Interesados",
    types: ["Predictivo", "Híbrido"],
    phases: ["inicio"],
    purpose: "Identificar y documentar evaluación (expectativas) y clasificación (poder/interés) de los stakeholders.",
    sections: [
      {
        title: "Identificación",
        instruction: I("Registre a cada interesado con su organización, rol y datos de contacto. Incluya a quienes afectan o son afectados por el proyecto."),
        table: { headers: ["ID", "Nombre", "Organización", "Rol", "Contacto"], rows: 5 },
      },
      {
        title: "Evaluación: requisitos y expectativas",
        instruction: I("Documente los requisitos principales, las expectativas y la influencia potencial de cada interesado."),
        table: { headers: ["ID", "Requisitos principales", "Expectativas", "Influencia"], rows: 5 },
      },
      {
        title: "Clasificación Poder / Interés",
        instruction: I("Clasifique a cada interesado en la cuadrícula Poder vs. Interés y asigne la estrategia: Gestionar de Cerca, Mantener Satisfecho, Mantener Informado o Monitorear."),
        table: { headers: ["ID", "Poder (Alto/Bajo)", "Interés (Alto/Bajo)", "Estrategia"], rows: 5 },
      },
      {
        title: "Matriz de evaluación del involucramiento",
        instruction: I("Indique el nivel actual (A) y deseado (D) de cada interesado: Desconocedor, Resistente, Neutral, Partidario o Líder. Defina acciones para cerrar las brechas."),
        table: { headers: ["ID", "Actual", "Deseado", "Acción para cerrar la brecha"], rows: 5 },
      },
    ],
  },
  {
    id: "plan-direccion",
    name: "Plan para la Dirección del Proyecto",
    types: ["Predictivo", "Híbrido"],
    phases: ["planificacion"],
    purpose: "Documento maestro que integra todas las líneas base (alcance, cronograma, costo) y planes subsidiarios para guiar la ejecución y el control.",
    sections: [
      { title: "Enfoque del ciclo de vida y del desarrollo", instruction: I("Describa el ciclo de vida elegido (predictivo, adaptativo o híbrido), sus fases y la justificación del enfoque.") },
      {
        title: "Líneas base del proyecto",
        instruction: I("Resuma las líneas base aprobadas e indique dónde se encuentra cada documento fuente."),
        subsections: [
          { title: "Línea base del alcance", instruction: I("Enunciado del alcance, EDT y Diccionario de la EDT aprobados (versión y fecha).") },
          { title: "Línea base del cronograma", instruction: I("Fechas de inicio y fin aprobadas, hitos y ruta crítica.") },
          { title: "Línea base de costos", instruction: I("Presupuesto por periodo (curva S), reserva de contingencia y BAC. Indique por separado la reserva de gestión.") },
        ],
      },
      {
        title: "Planes subsidiarios",
        instruction: I("Liste cada plan de gestión, su responsable y su ubicación."),
        table: { headers: ["Plan", "Responsable", "Versión", "Ubicación"], rows: 8 },
      },
      { title: "Gobernanza y control de cambios", instruction: I("Defina el Comité de Control de Cambios (CCB), la autoridad del director del proyecto, los umbrales de tolerancia y escalamiento y el flujo de aprobación.") },
      { title: "Medición del desempeño", instruction: I("Indique cómo se medirá el desempeño (valor ganado: CPI, SPI, EAC), la frecuencia de los informes y los umbrales de alerta.") },
      { title: "Revisiones y gestión de la configuración", instruction: I("Describa las revisiones de fase, las auditorías y cómo se controlarán las versiones de los entregables y documentos.") },
    ],
  },
  {
    id: "plan-alcance-requisitos",
    name: "Plan de Gestión del Alcance y Requisitos",
    types: ["Predictivo"],
    phases: ["planificacion"],
    purpose: "Definir cómo se recopilarán los requisitos, cómo se creará la EDT/WBS y cómo se validará el alcance.",
    sections: [
      { title: "Recopilación de requisitos", instruction: I("Indique las técnicas que se usarán (entrevistas, talleres, prototipos, observación) y quiénes participan.") },
      { title: "Priorización y aprobación de requisitos", instruction: I("Defina el criterio de priorización (por ejemplo, MoSCoW) y quién aprueba los requisitos.") },
      {
        title: "Matriz de trazabilidad de requisitos",
        instruction: I("Explique cómo se trazará cada requisito hacia adelante (requisito → paquete de trabajo → entregable) y hacia atrás (entregable → requisito → objetivo)."),
        table: { headers: ["ID requisito", "Descripción", "Origen", "Paquete EDT", "Criterio de aceptación"], rows: 4 },
      },
      { title: "Creación de la EDT y su Diccionario", instruction: I("Describa cómo se descompondrá el trabajo (regla del 100%), el nivel de los paquetes de trabajo y el contenido del Diccionario de la EDT.") },
      { title: "Validación del alcance", instruction: I("Detalle cómo se obtendrá la aceptación formal del cliente sobre entregables ya verificados por Control de Calidad.") },
      { title: "Control del alcance", instruction: I("Indique cómo se gestionarán los cambios al alcance mediante el control integrado de cambios.") },
    ],
  },
  {
    id: "plan-cronograma-costos",
    name: "Plan de Gestión del Cronograma y Costos",
    types: ["Predictivo"],
    phases: ["planificacion"],
    purpose: "Establecer las políticas y documentación para planificar, gestionar y controlar el tiempo y el presupuesto (curva S, valor ganado).",
    sections: [
      { title: "Metodología de programación", instruction: I("Indique la herramienta, el método (ruta crítica, PERT) y el calendario de trabajo del proyecto.") },
      { title: "Estimación de duración y costos", instruction: I("Defina los métodos de estimación (análoga, paramétrica, ascendente, tres valores) y el nivel de precisión esperado.") },
      { title: "Unidades de medida y moneda", instruction: I("Especifique unidades de tiempo (días laborables) y moneda (USD).") },
      {
        title: "Reservas",
        instruction: I("Explique cómo se calcula la reserva de contingencia (EMV de riesgos, dentro de la línea base) y la reserva de gestión (% definido por la PMO, fuera de la línea base)."),
        table: { headers: ["Reserva", "Monto (USD)", "Método", "Quién la autoriza"], rows: 2, firstColumn: ["Contingencia", "Gestión"] },
      },
      {
        title: "Medición del desempeño (valor ganado)",
        instruction: I("Defina la regla de avance (por ejemplo, 0/100 o 50/50), la frecuencia de medición y las fórmulas: CPI = EV/AC, SPI = EV/PV, EAC = BAC/CPI."),
        table: { headers: ["Indicador", "Verde", "Ámbar", "Rojo"], rows: 2, firstColumn: ["CPI", "SPI"] },
      },
      { title: "Umbrales de control", instruction: I("Indique la tolerancia operativa y el umbral de escalamiento para desviaciones de costo y cronograma.") },
      { title: "Formato de informes", instruction: I("Describa el contenido de los informes de desempeño (curva S, semáforos, pronósticos) y su distribución.") },
    ],
  },
  {
    id: "plan-calidad",
    name: "Plan de Gestión de Calidad",
    types: ["General"],
    phases: ["planificacion"],
    purpose: "Identificar los estándares de calidad relevantes y definir métricas, inspecciones y auditorías necesarias.",
    sections: [
      { title: "Estándares y normativas aplicables", instruction: I("Liste las normas, regulaciones y políticas de calidad de la organización que aplican al proyecto.") },
      { title: "Roles y responsabilidades de calidad", instruction: I("Indique quién asegura, quién controla y quién aprueba la calidad.") },
      {
        title: "Métricas de calidad",
        instruction: I("Defina cada métrica con su definición operativa, tolerancia y método de medición."),
        table: { headers: ["Métrica", "Definición", "Tolerancia", "Método de medición"], rows: 4 },
      },
      {
        title: "Control de calidad (inspecciones)",
        instruction: I("Describa las inspecciones internas que verifican que cada entregable cumple las especificaciones antes de presentarlo al cliente."),
        table: { headers: ["Entregable", "Inspección", "Responsable", "Frecuencia"], rows: 4 },
      },
      { title: "Aseguramiento de calidad (auditorías)", instruction: I("Planifique las auditorías de procesos y la gestión de no conformidades.") },
      { title: "Mejora continua", instruction: I("Describa cómo se capturarán y aplicarán las lecciones aprendidas de calidad.") },
    ],
  },
  {
    id: "plan-comunicaciones",
    name: "Plan de Comunicaciones",
    types: ["Predictivo"],
    phases: ["planificacion"],
    purpose: "Definir la matriz de flujos de información, responsables, medios y canales de escalamiento.",
    sections: [
      {
        title: "Matriz de comunicaciones",
        instruction: I("Para cada comunicación indique qué información, a quién, quién la envía, el medio, la frecuencia y el método (Push, Pull o Interactivo)."),
        table: { headers: ["Información", "Destinatario", "Responsable", "Medio", "Frecuencia", "Método"], rows: 5 },
      },
      { title: "Canales de escalamiento", instruction: I("Defina los niveles de escalamiento, los tiempos de respuesta y los contactos de cada nivel.") },
      { title: "Glosario y convenciones", instruction: I("Incluya términos, siglas y plantillas acordadas para la comunicación del proyecto.") },
      { title: "Restricciones y confidencialidad", instruction: I("Indique restricciones de idioma, horario, regulación o confidencialidad de la información.") },
    ],
  },
  {
    id: "product-backlog",
    name: "Product Backlog (Requisitos)",
    types: ["Ágil"],
    phases: ["planificacion", "ejecucion"],
    purpose: "Gestionar y priorizar historias de usuario, épicas y criterios de aceptación (DoD).",
    sections: [
      { title: "Visión del producto", instruction: I("Escriba la visión en una o dos frases: para quién, qué necesidad resuelve y qué lo diferencia.") },
      {
        title: "Épicas",
        instruction: I("Liste las épicas con su objetivo de negocio y prioridad."),
        table: { headers: ["Épica", "Objetivo de negocio", "Prioridad"], rows: 3 },
      },
      {
        title: "Historias de usuario",
        instruction: I("Use el formato: Como <rol>, quiero <funcionalidad>, para <beneficio>. Agregue criterios de aceptación verificables y la estimación."),
        table: { headers: ["ID", "Historia de usuario", "Criterios de aceptación", "Estimación", "Prioridad"], rows: 6 },
      },
      { title: "Definición de Terminado (DoD)", instruction: I("Liste las condiciones que debe cumplir todo incremento para considerarse terminado (pruebas, revisión, documentación).") },
      { title: "Reglas de priorización y refinamiento", instruction: I("Indique quién prioriza (Product Owner), el criterio de valor y la cadencia de refinamiento.") },
    ],
  },
  {
    id: "registro-riesgos",
    name: "Registro de Riesgos",
    types: ["Híbrido"],
    phases: ["planificacion", "control"],
    purpose: "Identificar, evaluar (Probabilidad x Impacto) y planificar respuestas a amenazas/oportunidades.",
    sections: [
      { title: "Metodología y escalas", instruction: I("Defina las escalas de probabilidad e impacto y la matriz de Probabilidad x Impacto que usará el proyecto.") },
      {
        title: "Registro de riesgos",
        instruction: I("Redacte cada riesgo como: Debido a <causa>, puede ocurrir <evento>, lo que provocaría <efecto>. Todo riesgo debe tener un dueño asignado."),
        table: { headers: ["ID", "Riesgo", "Tipo", "Probabilidad", "Impacto", "P x I", "Estrategia", "Dueño"], rows: 5 },
      },
      { title: "Respuestas planificadas y disparadores", instruction: I("Detalle las acciones de respuesta, los disparadores que las activan y los planes de contingencia.") },
      { title: "Reserva de contingencia", instruction: I("Calcule la reserva como la suma del EMV de amenazas menos la suma del EMV de oportunidades.") },
      { title: "Seguimiento", instruction: I("Indique la frecuencia de revisión de riesgos y cómo se registran los riesgos materializados como incidentes.") },
    ],
  },
  {
    id: "acta-reunion",
    name: "Acta de Reunión",
    types: ["General"],
    phases: ["ejecucion", "control"],
    purpose: "Documentar acuerdos con elementos de acción que tengan Responsable (Dueño) y Fecha Límite.",
    sections: [
      {
        title: "Datos de la reunión",
        instruction: I("Registre fecha, hora, lugar o enlace, facilitador y asistentes."),
        table: { headers: ["Fecha", "Hora", "Lugar / Enlace", "Facilitador"], rows: 1 },
      },
      { title: "Agenda", instruction: I("Liste los temas tratados en orden.") },
      { title: "Decisiones y acuerdos", instruction: I("Documente cada decisión tomada y el acuerdo alcanzado, sin ambigüedades.") },
      {
        title: "Elementos de acción (Action Items)",
        instruction: I("Cada elemento de acción debe tener obligatoriamente un Responsable (Dueño) y una Fecha Límite. No registre acciones sin dueño."),
        table: { headers: ["#", "Acción", "Responsable (Dueño)", "Fecha Límite", "Estado"], rows: 5 },
      },
      { title: "Próxima reunión", instruction: I("Indique fecha y temas pendientes para la próxima sesión.") },
    ],
  },
  {
    id: "solicitud-cambio",
    name: "Solicitud de Cambio (CR)",
    types: ["Predictivo", "Híbrido"],
    phases: ["control"],
    purpose: "Evaluar impactos en las líneas base (tiempo, costo, alcance) y buscar aprobación formal del comité (CCB).",
    sections: [
      {
        title: "Datos de la solicitud",
        instruction: I("Toda solicitud debe registrarse por escrito: una solicitud verbal no es válida. Indique solicitante, fecha y tipo de cambio (acción preventiva, acción correctiva, reparación de defectos o actualización)."),
        table: { headers: ["Solicitante", "Fecha", "Tipo de cambio", "¿Regulatorio/Legal? (Sí/No)"], rows: 1 },
      },
      { title: "Descripción y justificación", instruction: I("Describa exactamente qué se solicita cambiar y por qué.") },
      {
        title: "Análisis de impacto integral",
        instruction: I("Evalúe las siete dimensiones antes de proponer una solución. No envíe al CCB una solicitud con el análisis incompleto."),
        table: {
          headers: ["Dimensión", "Impacto", "Detalle"],
          rows: 7,
          firstColumn: ["Alcance", "Cronograma (¿ruta crítica?)", "Costo (USD y % del BAC)", "Calidad", "Recursos", "Riesgos", "Beneficios / Caso de negocio"],
        },
      },
      { title: "Alternativas sin modificar la línea base", instruction: I("Documente las alternativas evaluadas. Si alguna resuelve la necesidad sin mover la línea base, no se requiere el CCB.") },
      {
        title: "Decisión del CCB",
        instruction: I("Registre la resolución (Aprobada, Rechazada o Diferida), su justificación y la fecha. Un cambio regulatorio o legal no puede rechazarse."),
        table: { headers: ["Resolución", "Justificación", "Fecha", "Líneas base afectadas"], rows: 1 },
      },
      { title: "Implementación y comunicación", instruction: I("Indique cómo se actualizarán las líneas base y a quién se comunicará el estado.") },
    ],
  },
  {
    id: "informe-retrospectiva",
    name: "Informe de Retrospectiva",
    types: ["Ágil"],
    phases: ["control"],
    purpose: "Fomentar la mejora continua evaluando qué salió bien y qué se debe ajustar en la iteración.",
    sections: [
      {
        title: "Datos de la iteración",
        instruction: I("Indique el sprint o iteración, las fechas, el objetivo y los participantes."),
        table: { headers: ["Iteración", "Fechas", "Objetivo", "Participantes"], rows: 1 },
      },
      { title: "Métricas de la iteración", instruction: I("Registre velocidad, compromiso frente a lo completado e impedimentos.") },
      { title: "¿Qué salió bien?", instruction: I("Liste las prácticas que funcionaron y deben mantenerse.") },
      { title: "¿Qué se debe ajustar?", instruction: I("Liste los problemas observados sin buscar culpables; enfóquese en el proceso.") },
      {
        title: "Acciones de mejora",
        instruction: I("Defina pocas acciones concretas, cada una con responsable y fecha, para aplicar en la siguiente iteración."),
        table: { headers: ["Acción", "Responsable", "Fecha", "Indicador de éxito"], rows: 3 },
      },
    ],
  },
  {
    id: "acta-cierre",
    name: "Acta de Cierre de Proyecto",
    types: ["Híbrido"],
    phases: ["cierre"],
    purpose: "Formalizar la aceptación final de los entregables, transferir a operaciones y recopilar lecciones aprendidas.",
    sections: [
      { title: "Resumen del proyecto", instruction: I("Resuma los objetivos, el alcance entregado y el resultado frente a los criterios de éxito del Acta de Constitución.") },
      {
        title: "Aceptación de entregables",
        instruction: I("Registre cada entregable verificado por Control de Calidad y aceptado formalmente por el cliente, con su requisito de la RTM."),
        table: { headers: ["Entregable", "ID RTM", "Verificado (QC)", "Aceptado por", "Fecha"], rows: 4 },
      },
      {
        title: "Desempeño final",
        instruction: I("Compare el cronograma y el costo final contra las líneas base (BAC frente a costo real, fecha planificada frente a real)."),
        table: { headers: ["Indicador", "Línea base", "Real", "Variación"], rows: 3, firstColumn: ["Costo (USD)", "Fecha de fin", "Alcance"] },
      },
      { title: "Transición a operaciones", instruction: I("Indique quién recibe cada entregable, el plan de mantenimiento y las métricas de beneficio a seguir midiendo.") },
      { title: "Cierre de contratos y administrativo", instruction: I("Confirme entregas conformes, pagos finales, auditorías, ausencia de reclamaciones, archivo de documentación y liberación de recursos.") },
      { title: "Lecciones aprendidas", instruction: I("Separe el conocimiento explícito (repositorio OPA) del tácito (plan de transferencia: quién lo posee, quién lo recibe, método y fecha).") },
    ],
  },
];

export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id);

/** Plantillas maestras: el encabezado lleva campos para completar en cada uso. */
export const STATIC_HEADER = { client: "[Nombre del cliente]", project: "[Nombre del proyecto]", date: "[dd/mm/aaaa]" };

/** Nombre del documento maestro en la carpeta madre. */
export const templateDocName = (t: DocTemplate) => `${t.name} — Plantilla Estándar`;

/** Enlace que abre el diálogo "Hacer una copia" de Google Docs (a partir del ID del documento). */
export const copyUrl = (docId: string) => `https://docs.google.com/document/d/${encodeURIComponent(docId)}/copy`;

const APPROACH_TO_TYPE: Record<ApproachType, TemplateType> = { Predictivo: "Predictivo", Agil: "Ágil", Hibrido: "Híbrido" };

/** Plantilla aplicable al enfoque del proyecto (o de uso general). */
export const isRecommended = (t: DocTemplate, approach?: ApproachType | null) =>
  !!approach && (t.types.includes(APPROACH_TO_TYPE[approach]) || t.types.includes("General"));
