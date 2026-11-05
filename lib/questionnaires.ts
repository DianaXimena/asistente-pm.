import type { QuestionnaireId } from "./types";

export interface QuestionnaireMeta {
  id: QuestionnaireId;
  title: string;
  /** Nombre usado en el mensaje del asistente ("...el cuestionario del {label}"). */
  label: string;
  /** Preposición + artículo para el mensaje ("del" por defecto). */
  prep?: "del" | "de la";
  href: string;
  hint: string;
  /** Qué cubre el cuestionario (pantalla de inicio). */
  description: string;
}

// Cuestionarios descritos en los documentos de diseño.
export const QUESTIONNAIRES: Record<QuestionnaireId, QuestionnaireMeta> = {
  "acta-constitucion": {
    id: "acta-constitucion",
    title: "Acta de Constitución",
    label: "Project Charter",
    href: "/cuestionario/acta-constitucion",
    hint: "4 preguntas · una por pantalla · ~3 min",
    description: "Propósito y objetivo medible, autoridad del PM, presupuesto e hitos, y Patrocinador que autoriza el proyecto.",
  },
  "registro-interesados": {
    id: "registro-interesados",
    title: "Registro de Interesados Inicial",
    label: "Registro de Interesados",
    href: "/cuestionario/registro-interesados",
    hint: "3 niveles por interesado: identificación, poder/interés e involucramiento",
    description: "Identificación de cada interesado, clasificación Poder vs. Interés y nivel de involucramiento actual vs. deseado.",
  },
  "linea-base-alcance": {
    id: "linea-base-alcance",
    title: "Línea Base del Alcance",
    label: "Alcance (EDT + Diccionario)",
    href: "/cuestionario/linea-base-alcance",
    hint: "4 pasos: alcance del producto, entregables, paquetes de trabajo y límites",
    description: "Enunciado del alcance del producto, criterios de aceptación, EDT (entregables y paquetes de trabajo), Diccionario de la EDT, exclusiones, supuestos y restricciones.",
  },
  "linea-base-cronograma": {
    id: "linea-base-cronograma",
    title: "Línea Base del Cronograma",
    label: "Cronograma",
    href: "/cuestionario/linea-base-cronograma",
    hint: "3 pasos: inicio, duraciones y dependencias",
    description: "Fecha de inicio, método de estimación (única o PERT de tres valores), duración y dependencias de cada paquete de trabajo; calcula fechas y ruta crítica.",
  },
  "registro-riesgos": {
    id: "registro-riesgos",
    title: "Registro de Riesgos",
    label: "Registro de Riesgos",
    href: "/cuestionario/registro-riesgos",
    hint: "4 preguntas por riesgo · el dueño es obligatorio",
    description: "Enunciado de cada riesgo (causa, evento, efecto), probabilidad e impacto en USD, estrategia de respuesta y dueño obligatorio.",
  },
  "linea-base-costos": {
    id: "linea-base-costos",
    title: "Línea Base de Costos",
    label: "Presupuesto (Línea Base de Costos)",
    href: "/cuestionario/linea-base-costos",
    hint: "3 pasos: estimaciones, reserva de contingencia y reserva de gestión",
    description: "Estimación por paquete de trabajo, reserva de contingencia (EMV de riesgos) y reserva de gestión para obtener la línea base y el presupuesto total.",
  },
  "lecciones-aprendidas": {
    id: "lecciones-aprendidas",
    title: "Registro de Lecciones Aprendidas",
    label: "Registro de Lecciones Aprendidas",
    href: "/cuestionario/lecciones-aprendidas",
    hint: "3 preguntas por lección · registro vivo durante todo el proyecto",
    description: "Qué pasó y si fue positivo o negativo, área de conocimiento e impacto, y la recomendación para futuros proyectos.",
  },
  "asignacion-recursos": {
    id: "asignacion-recursos",
    title: "Asignación de Recursos",
    label: "Asignación de Recursos",
    prep: "de la",
    href: "/cuestionario/asignacion-recursos",
    hint: "4 pasos: equipo, matriz RACI, formalización y revisión",
    description: "Equipo del proyecto con su dedicación, responsable (A) y ejecutores (R) de cada paquete de trabajo, y formalización del acuerdo.",
  },
  "informe-desempeno": {
    id: "informe-desempeno",
    title: "Informe de Desempeño del Trabajo",
    label: "Informe de Desempeño",
    href: "/cuestionario/informe-desempeno",
    hint: "5 pasos · menos de 5 minutos",
    description: "Captura de PV, EV y AC, avance de entregables, diagnóstico automático (CPI, SPI, EAC, VAC) y distribución Push/Pull a los interesados.",
  },
  "registro-evm": {
    id: "registro-evm",
    title: "Registro mensual de CPI y SPI",
    label: "Informe de Desempeño",
    href: "/cuestionario/informe-desempeno",
    hint: "Informe mensual con EV, PV y AC al día",
    description: "Mediciones mensuales de valor ganado al día: se registran con el Informe de Desempeño.",
  },
  "registro-incidentes": {
    id: "registro-incidentes",
    title: "Registro de Incidentes",
    label: "Registro de Incidentes",
    href: "/cuestionario/registro-incidentes",
    hint: "Incidentes con responsable · conversión desde riesgos materializados",
    description: "Hechos presentes que afectan al proyecto: severidad, responsable, plan de respuesta y si impactan una línea base.",
  },
  "solicitud-cambio": {
    id: "solicitud-cambio",
    title: "Registro de Cambios",
    label: "Registro de Cambios",
    href: "/cuestionario/solicitud-cambio",
    hint: "Escalera de 9 peldaños por cada solicitud",
    description: "Solicitudes de cambio con la escalera de 9 peldaños: entender, impacto integral, conversación, alternativas, decisión PM/CCB, implementación y comunicación.",
  },
  "aceptacion-entregables": {
    id: "aceptacion-entregables",
    title: "Aceptación Formal del Cliente",
    label: "Aceptación de Entregables",
    prep: "de la",
    href: "/cuestionario/aceptacion-entregables",
    hint: "3 pasos por entregable: acta de aceptación, receptor operativo y métricas de beneficio",
    description: "Validar el Alcance con el cliente sobre entregables ya verificados por Calidad, y transición a operaciones.",
  },
  "cierre-contratos": {
    id: "cierre-contratos",
    title: "Cierre de Contratos y Administrativo",
    label: "Cierre de Contratos",
    href: "/cuestionario/cierre-contratos",
    hint: "3 pasos: contratos, cierre financiero y liberación",
    description: "Cierre de adquisiciones (entregas conformes, pagos, auditoría, reclamaciones) y cierre administrativo del proyecto.",
  },
  "archivo-lecciones": {
    id: "archivo-lecciones",
    title: "Archivo de Lecciones Aprendidas",
    label: "Archivo de Lecciones Aprendidas",
    href: "/cuestionario/archivo-lecciones",
    hint: "3 pasos: clasificar, publicar como OPA y transferir conocimiento tácito",
    description: "Convierte el registro vivo en un Activo de los Procesos de la Organización (OPA) y planifica la transferencia de conocimiento tácito.",
  },
};
