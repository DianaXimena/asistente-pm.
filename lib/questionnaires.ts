import type { QuestionnaireId } from "./types";

export interface QuestionnaireMeta {
  id: QuestionnaireId;
  title: string;
  /** Nombre usado en el mensaje del asistente ("...el cuestionario del {label}"). */
  label: string;
  questions: number;
}

// Metadatos de los cuestionarios descritos en la sección 3 del documento de diseño.
export const QUESTIONNAIRES: Record<QuestionnaireId, QuestionnaireMeta> = {
  "acta-constitucion": {
    id: "acta-constitucion",
    title: "Acta de Constitución",
    label: "Project Charter",
    questions: 4,
  },
  "registro-riesgos": {
    id: "registro-riesgos",
    title: "Registro de Riesgos Inicial",
    label: "Registro de Riesgos",
    questions: 4,
  },
  "solicitud-cambio": {
    id: "solicitud-cambio",
    title: "Solicitud de Cambio",
    label: "Change Request",
    questions: 5,
  },
};
