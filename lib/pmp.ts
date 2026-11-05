import { QUESTIONNAIRES } from "./questionnaires";
import type { PhaseId, QuestionnaireId } from "./types";

// Descripciones por defecto del marco de dirección de proyectos (PMP) para los tooltips.

export const PHASE_TOOLTIPS: Record<PhaseId, string> = {
  inicio: "Reconoce formalmente la existencia del proyecto o lo establece.",
  planificacion: "Integra todos los planes de gestión y líneas base para crear un plan creíble, realista y formal.",
  ejecucion: "Facilitar y producir el trabajo de acuerdo con el plan para la dirección del proyecto.",
  control: "Medir y analizar el desempeño para compararlo con el plan para la dirección del proyecto y con las líneas base.",
  cierre: "Finalizar las actividades para cerrar el proyecto o la fase, incluyendo la validación de la transición o lecciones aprendidas.",
};

const DOC_OVERRIDES: Partial<Record<QuestionnaireId, string>> = {
  "acta-constitucion": "Autoriza el proyecto y le concede al director del proyecto la autoridad de comprometer recursos corporativos.",
};

/** Descripción de un documento clave: la del marco PMP o, en su defecto, la del cuestionario. */
export const docTooltip = (q?: QuestionnaireId) => (q ? (DOC_OVERRIDES[q] ?? QUESTIONNAIRES[q].description) : "");
