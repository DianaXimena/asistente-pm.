import type { QuestionnaireId } from "./types";

export interface QuestionnaireMeta {
  id: QuestionnaireId;
  title: string;
  /** Nombre usado en el mensaje del asistente ("...el cuestionario del {label}"). */
  label: string;
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
  "solicitud-cambio": {
    id: "solicitud-cambio",
    title: "Solicitud de Cambio",
    label: "Change Request",
    href: "/cuestionario/solicitud-cambio",
    hint: "5 preguntas",
    description: "Qué se solicita cambiar, tipo de cambio, impacto en las líneas base, análisis de impacto y alternativas.",
  },
};
