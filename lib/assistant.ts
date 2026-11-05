import { QUESTIONNAIRES } from "./questionnaires";
import { engagementLabel, needsPriorityEngagement } from "./stakeholders";
import type { ApproachType, InputStatus, MandatoryInput, Phase, PhaseStatus, Project, Semaforo } from "./types";

export const APPROACH_LABEL: Record<ApproachType, string> = {
  Predictivo: "Predictivo",
  Agil: "Ágil / Adaptativo",
  Hibrido: "Híbrido",
};

export function getCurrentPhase(project: Project): Phase {
  return project.phases.find((p) => p.id === project.current_phase) ?? project.phases[0];
}

/** Compuerta de salida: todos los insumos obligatorios de la fase actual están aprobados. */
export function canAdvance(project: Project): boolean {
  const idx = project.phases.findIndex((p) => p.id === project.current_phase);
  const ph = project.phases[idx];
  return !!ph && idx < project.phases.length - 1 && ph.mandatory_inputs.every((i) => i.status === "Aprobado");
}

/** Progreso global: promedio de las 5 fases con peso equitativo (20% cada una). */
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
  // Un insumo obligatorio sin iniciar en la fase actual bloquea el avance.
  if (phaseIsCurrent && status === "No Iniciado") return "rojo";
  if (phaseIsCurrent) return "ambar";
  return "neutro";
}

export type AssistantCta =
  | { kind: "link"; label: string; href: string; hint?: string }
  | { kind: "advance"; label: string; hint?: string };

export interface AssistantAlert {
  id: string;
  title: string;
  detail: string;
  action?: "sign-acta";
}

export interface AssistantMessage {
  phaseName: string;
  progress: number;
  /** Texto principal leído desde los estados del proyecto. */
  message: string;
  cta?: AssistantCta;
  pendingInput?: MandatoryInput;
}

/**
 * Motor del asistente: lee el enfoque, la fase actual y los insumos obligatorios
 * y construye la siguiente acción recomendada para el PM.
 */
export function getAssistantMessage(project: Project): AssistantMessage {
  const phase = getCurrentPhase(project);
  const base = `Estás en la fase de ${phase.phase_name} (${phase.progress_percentage}%).`;
  const common = { phaseName: phase.phase_name, progress: phase.progress_percentage };

  // 1. Sin enfoque: el primer insumo determina si el proyecto es Predictivo, Ágil o Híbrido.
  if (!project.approach) {
    return {
      ...common,
      message: "Proyecto creado. Carga el primer insumo para detectar el enfoque del proyecto (Predictivo, Ágil o Híbrido).",
      cta: { kind: "link", label: "Cargar primer insumo", href: "/nuevo/insumo", hint: "Contrato, SOW, backlog u otro documento" },
    };
  }

  const pending = phase.mandatory_inputs.filter((i) => i.status !== "Aprobado");
  const actionable = pending.filter((i) => i.status !== "Pendiente de Firma");

  // 2. Insumo con cuestionario guiado.
  const withQ = actionable.find((i) => i.questionnaire);
  if (withQ?.questionnaire) {
    const q = QUESTIONNAIRES[withQ.questionnaire];
    return {
      ...common,
      message: `${base} Haz clic aquí para llenar el cuestionario del ${q.label}`,
      pendingInput: withQ,
      cta: { kind: "link", label: "Llenar cuestionario", href: q.href, hint: q.hint },
    };
  }

  // 3. Insumo sin cuestionario todavía.
  if (actionable.length > 0) {
    return { ...common, message: `${base} Siguiente insumo obligatorio: ${actionable[0].artifact_name}.`, pendingInput: actionable[0] };
  }

  // 4. Solo quedan firmas pendientes.
  if (pending.length > 0) {
    return {
      ...common,
      message: `${base} Solo falta la firma del Patrocinador en "${pending[0].artifact_name}" para cerrar la fase.`,
      pendingInput: pending[0],
    };
  }

  // 5. Compuerta de salida abierta.
  const next = project.phases[project.phases.findIndex((p) => p.id === phase.id) + 1];
  if (next && canAdvance(project)) {
    return {
      ...common,
      message: `${base} Todos los insumos obligatorios están aprobados. Haz clic aquí para avanzar a ${next.phase_name}.`,
      cta: { kind: "advance", label: `Avanzar a ${next.phase_name}` },
    };
  }

  return { ...common, message: `${base} Todos los insumos obligatorios están aprobados.` };
}

/** Alertas proactivas visibles en el panel principal. */
export function getAlerts(project: Project): AssistantAlert[] {
  const alerts: AssistantAlert[] = [];
  const acta = project.phases.flatMap((p) => p.mandatory_inputs).find((i) => i.questionnaire === "acta-constitucion");
  if (acta?.status === "Pendiente de Firma") {
    alerts.push({
      id: "acta-firma",
      title: "Falta firma de Patrocinador en Acta",
      detail: "El Acta no es válida hasta que el Patrocinador la firme formalmente.",
      action: "sign-acta",
    });
  }
  for (const s of project.stakeholders.filter(needsPriorityEngagement)) {
    alerts.push({
      id: `inv-${s.stakeholder_id}`,
      title: `Alerta de Involucramiento Prioritario: ${s.name}`,
      detail: `Alto poder con brecha negativa (Actual: ${engagementLabel(s.current_level)} → Deseado: ${engagementLabel(
        s.desired_level,
      )}).${s.action_plan ? ` Plan: ${s.action_plan}` : ""}`,
    });
  }
  return alerts;
}
