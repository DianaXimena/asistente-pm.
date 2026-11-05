import { QUESTIONNAIRES, type QuestionnaireMeta } from "./questionnaires";
import type { ApproachType, InputStatus, MandatoryInput, Phase, PhaseStatus, Project, Semaforo } from "./types";

export const APPROACH_LABEL: Record<ApproachType, string> = {
  Predictivo: "Predictivo",
  Agil: "Ágil / Adaptativo",
  Hibrido: "Híbrido",
};

export function getCurrentPhase(project: Project): Phase {
  return project.phases.find((p) => p.id === project.current_phase) ?? project.phases[0];
}

/**
 * Progreso global: promedio de las 5 fases con peso igual (20% c/u).
 * Supuesto provisional: el documento indica "barra ponderada por fase" sin fijar los pesos.
 */
export function getOverallProgress(project: Project): number {
  const total = project.phases.reduce((acc, p) => acc + p.progress_percentage, 0);
  return Math.round(total / project.phases.length);
}

export function phaseSemaforo(status: PhaseStatus): Semaforo {
  switch (status) {
    case "Completada":
      return "verde";
    case "En Progreso":
      return "ambar";
    case "Bloqueada":
      return "rojo";
    default:
      return "neutro";
  }
}

export function inputSemaforo(status: InputStatus, phaseIsCurrent: boolean): Semaforo {
  if (status === "Aprobado") return "verde";
  // Un insumo obligatorio no aprobado en la fase actual bloquea el avance.
  if (phaseIsCurrent && status === "No Iniciado") return "rojo";
  if (phaseIsCurrent) return "ambar";
  return "neutro";
}

export interface AssistantMessage {
  phaseName: string;
  progress: number;
  /** Texto principal leído desde los estados del proyecto. */
  message: string;
  /** Insumo bloqueante sobre el que actúa la sugerencia. */
  pendingInput?: MandatoryInput;
  questionnaire?: QuestionnaireMeta;
  href?: string;
  /** Insumos obligatorios restantes de la fase. */
  remaining: number;
}

/**
 * Motor del asistente: lee la fase actual y el primer insumo obligatorio pendiente
 * y construye la siguiente acción recomendada para el PM.
 */
export function getAssistantMessage(project: Project): AssistantMessage {
  const phase = getCurrentPhase(project);
  const pending = phase.mandatory_inputs.filter((i) => i.status !== "Aprobado");
  const withQuestionnaire = pending.find((i) => i.questionnaire);
  const base = `Estás en la fase de ${phase.phase_name} (${phase.progress_percentage}%).`;

  if (withQuestionnaire?.questionnaire) {
    const q = QUESTIONNAIRES[withQuestionnaire.questionnaire];
    return {
      phaseName: phase.phase_name,
      progress: phase.progress_percentage,
      message: `${base} Haz clic aquí para llenar el cuestionario del ${q.label}`,
      pendingInput: withQuestionnaire,
      questionnaire: q,
      href: `/cuestionario/${q.id}`,
      remaining: pending.length,
    };
  }

  if (pending.length > 0) {
    return {
      phaseName: phase.phase_name,
      progress: phase.progress_percentage,
      message: `${base} Siguiente insumo obligatorio: ${pending[0].artifact_name}.`,
      pendingInput: pending[0],
      remaining: pending.length,
    };
  }

  return {
    phaseName: phase.phase_name,
    progress: phase.progress_percentage,
    message: `${base} Todos los insumos obligatorios están aprobados. Ya puedes avanzar a la siguiente fase.`,
    remaining: 0,
  };
}
