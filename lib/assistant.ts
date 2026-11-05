import { QUESTIONNAIRES } from "./questionnaires";
import { verifyAuditChain } from "./audit";
import { BASELINE_LABEL, REPLAN_MESSAGE, contingencyStatus, isCrOpen } from "./control";
import { BAND_GUIDANCE, evmGovernance } from "./governance";
import { RED_MESSAGE, evm, isOverdue, isRecurring, latestReport, requiredReportPeriod } from "./execution";
import { engagementLabel, needsPriorityEngagement } from "./stakeholders";
import type { ApproachType, InputStatus, MandatoryInput, Phase, PhaseStatus, Project, Semaforo } from "./types";

export const APPROACH_LABEL: Record<ApproachType, string> = {
  Predictivo: "Predictivo",
  Agil: "Adaptativo (Ágil)",
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

/** Dependencias pendientes de un insumo (deben estar aprobadas para iniciar su cuestionario). */
export function missingRequirements(project: Project, input: MandatoryInput): MandatoryInput[] {
  const all = project.phases.flatMap((p) => p.mandatory_inputs);
  return (input.requires ?? [])
    .map((q) => all.find((i) => i.questionnaire === q))
    .filter((i): i is MandatoryInput => !!i && i.status !== "Aprobado");
}

/**
 * Insumo en espera: la RTM ya tiene requisitos, pero su trazabilidad necesita la EDT aprobada.
 * El asistente pasa al siguiente insumo y vuelve a ella después.
 */
export function isWaiting(project: Project, input: MandatoryInput): boolean {
  if (input.questionnaire !== "matriz-trazabilidad" || input.status === "Aprobado") return false;
  const scope = project.phases.flatMap((p) => p.mandatory_inputs).find((i) => i.questionnaire === "linea-base-alcance");
  return project.requirements.length > 0 && scope?.status !== "Aprobado";
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
  | { kind: "advance"; label: string; hint?: string }
  | { kind: "close"; label: string; hint?: string };

export interface AssistantAlert {
  id: string;
  title: string;
  detail: string;
  action?: "sign-acta";
  href?: string;
  linkLabel?: string;
  severity?: "ambar" | "rojo";
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

  // 2. Insumo con cuestionario guiado cuyas dependencias ya están aprobadas.
  const withQ =
    actionable.find((i) => i.questionnaire && missingRequirements(project, i).length === 0 && !isWaiting(project, i)) ??
    actionable.find((i) => i.questionnaire && missingRequirements(project, i).length === 0);
  if (withQ?.questionnaire) {
    const q = QUESTIONNAIRES[withQ.questionnaire];
    return {
      ...common,
      message: `${base} Haz clic aquí para llenar el cuestionario ${q.prep ?? "del"} ${q.label}`,
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

  // Proyecto cerrado.
  if (project.closure?.closed_at) {
    return { ...common, message: "¡Proyecto cerrado! Entregables aceptados, contratos cerrados y lecciones archivadas como activos de la organización." };
  }

  // 5a. Replanificación terminada: vuelve a la fase desde la que se retrocedió.
  if (project.replanning && phase.id === "planificacion" && canAdvance(project)) {
    const back = project.phases.find((p) => p.id === project.replanning!.resume_phase)!;
    return {
      ...common,
      message: `${base} Líneas base actualizadas. Haz clic aquí para aprobar el Plan y volver a ${back.phase_name}.`,
      cta: { kind: "advance", label: `Aprobar Plan actualizado y volver a ${back.phase_name}` },
    };
  }

  // 5b. Compuerta de salida del proyecto.
  if (phase.id === "cierre") {
    return {
      ...common,
      message: `${base} Aceptación formal, contratos y lecciones listos. Haz clic aquí para celebrar y cerrar el proyecto.`,
      cta: { kind: "close", label: "Celebrar y Cerrar Proyecto" },
    };
  }

  // 5c. Compuerta de salida abierta.
  const next = project.phases[project.phases.findIndex((p) => p.id === phase.id) + 1];
  if (next && canAdvance(project)) {
    return {
      ...common,
      message: `${base} Todos los insumos obligatorios están aprobados. Haz clic aquí para avanzar a ${next.phase_name}.`,
      cta: {
        kind: "advance",
        label: phase.id === "planificacion" ? `Aprobar Plan y avanzar a ${next.phase_name}` : `Avanzar a ${next.phase_name}`,
      },
    };
  }

  return { ...common, message: `${base} Todos los insumos obligatorios están aprobados.` };
}

/** Alertas proactivas visibles en el panel principal. */
export function getAlerts(project: Project): AssistantAlert[] {
  const alerts: AssistantAlert[] = [];
  const chain = verifyAuditChain(project.audit_log ?? []);
  if (!chain.ok)
    alerts.push({
      id: "auditoria",
      title: "Bitácora de auditoría alterada",
      detail: `La cadena de integridad se rompe en la entrada #${chain.brokenAt}: los registros fueron modificados fuera del asistente.`,
      href: "/auditoria",
      linkLabel: "Ver bitácora",
      severity: "rojo",
    });
  // Proyecto cerrado: ya no hay alertas operativas.
  if (project.closure?.closed_at) return alerts;
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
  if (project.replanning) {
    alerts.push({
      id: "replanificacion",
      title: "Retroceso a Planificación (Replanificación)",
      detail: `${REPLAN_MESSAGE} Líneas base a actualizar: ${project.replanning.baselines.map((b) => BASELINE_LABEL[b]).join(", ")}.`,
      severity: "rojo",
    });
  }
  const pendingCr = project.change_requests.filter(isCrOpen);
  if (pendingCr.length) {
    alerts.push({
      id: "cr-pendientes",
      title: `${pendingCr.length} solicitud(es) de cambio sin resolver`,
      detail: "Completa la escalera de control de cambios hasta la decisión y la comunicación.",
      href: "/cuestionario/solicitud-cambio",
      linkLabel: "Ver cambios",
    });
  }
  for (const i of project.incidents.filter((x) => x.status !== "Resuelto" && x.severity === "Crítica")) {
    alerts.push({
      id: `inc-${i.id}`,
      title: `Incidente crítico abierto: ${i.title}`,
      detail: `Responsable: ${i.assigned_to}.`,
      href: "/cuestionario/registro-incidentes",
      linkLabel: "Ver incidentes",
      severity: "rojo",
    });
  }
  const cont = contingencyStatus(project);
  if (cont.reserve > 0 && cont.available < 0) {
    alerts.push({
      id: "contingencia",
      title: "Reserva de contingencia agotada",
      detail: "El uso supera la reserva dentro de la línea base: usar reserva de gestión requiere aprobación del Patrocinador o CCB (Solicitud de Cambio).",
      href: "/cuestionario/solicitud-cambio",
      linkLabel: "Solicitar cambio",
      severity: "rojo",
    });
  }
  const period = requiredReportPeriod(project);
  if (period) {
    alerts.push({
      id: "informe-mensual",
      title: "Cierre de mes: Genera el Informe de Desempeño",
      detail: `Falta el informe de ${period}. Las tareas quedan bloqueadas hasta cargar EV, PV y AC.`,
      href: "/cuestionario/informe-desempeno",
      linkLabel: "Generar informe",
      severity: "rojo",
    });
  }
  const last = latestReport(project);
  const health = last ? evm(last) : null;
  const gov = last ? evmGovernance(last, project) : null;
  if (gov && gov.band !== "Dentro de tolerancia") {
    alerts.push({
      id: "gobernanza-costo",
      title:
        gov.band === "Sobre umbral de escalamiento"
          ? `Escalamiento obligatorio: desviación de costo ${gov.cost_deviation_pct}% (umbral ${project.governance_thresholds.cost_escalation_threshold_percentage}%)`
          : `Fuera de tolerancia: desviación de costo ${gov.cost_deviation_pct}% (tolerancia ${project.governance_thresholds.cost_tolerance_percentage}%)`,
      detail: BAND_GUIDANCE[gov.band],
      severity: gov.escalation_mandatory ? "rojo" : "ambar",
      href: "/cuestionario/solicitud-cambio",
      linkLabel: gov.escalation_mandatory ? "Escalar" : "Acción correctiva",
    });
  }
  if (health?.color === "Rojo") {
    alerts.push({ id: "evm-rojo", title: `Alerta Crítica: CPI ${health.cpi} · SPI ${health.spi}`, detail: RED_MESSAGE, severity: "rojo" });
  } else if (health?.color === "Ámbar") {
    alerts.push({ id: "evm-ambar", title: `Desviación moderada: CPI ${health.cpi} · SPI ${health.spi}`, detail: health.message });
  }
  for (const i of project.impediments.filter(isRecurring)) {
    alerts.push({
      id: `rec-${i.id}`,
      title: `Impedimento recurrente: ${i.description}`,
      detail: "Registrar un impedimento no es resolverlo: reevalúa el proceso de fondo o sube de nivel en la escala de intervención.",
      href: "/ejecucion",
      linkLabel: "Ver tablero",
    });
  }
  for (const i of project.impediments.filter((x) => isOverdue(x) && !isRecurring(x))) {
    alerts.push({
      id: `due-${i.id}`,
      title: `Impedimento vencido: ${i.description}`,
      detail: `Dueño: ${i.owner}. Fecha límite superada.`,
      href: "/ejecucion",
      linkLabel: "Ver tablero",
    });
  }
  return alerts;
}
