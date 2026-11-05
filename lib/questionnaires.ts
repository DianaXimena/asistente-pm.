import type { QuestionnaireId } from "./types";

export interface QuestionnaireMeta {
  id: QuestionnaireId;
  title: string;
  /** Nombre usado en el mensaje del asistente ("...el cuestionario del {label}"). */
  label: string;
  href: string;
  hint: string;
}

// Cuestionarios descritos en los documentos de diseño.
export const QUESTIONNAIRES: Record<QuestionnaireId, QuestionnaireMeta> = {
  "acta-constitucion": {
    id: "acta-constitucion",
    title: "Acta de Constitución",
    label: "Project Charter",
    href: "/cuestionario/acta-constitucion",
    hint: "4 preguntas · una por pantalla · ~3 min",
  },
  "registro-interesados": {
    id: "registro-interesados",
    title: "Registro de Interesados Inicial",
    label: "Registro de Interesados",
    href: "/cuestionario/registro-interesados",
    hint: "3 niveles por interesado: identificación, poder/interés e involucramiento",
  },
  "registro-riesgos": {
    id: "registro-riesgos",
    title: "Registro de Riesgos Inicial",
    label: "Registro de Riesgos",
    href: "/cuestionario/registro-riesgos",
    hint: "4 preguntas obligatorias",
  },
  "solicitud-cambio": {
    id: "solicitud-cambio",
    title: "Solicitud de Cambio",
    label: "Change Request",
    href: "/cuestionario/solicitud-cambio",
    hint: "5 preguntas",
  },
};
