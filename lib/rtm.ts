import { progressOf, trackedItems } from "./execution";
import type { Project, Requirement } from "./types";

// Hallazgo 1 · Matriz de Trazabilidad de Requisitos (RTM) bidireccional.

const filled = (v: string) => v.trim().length > 0;

export function nextRequirementId(list: Requirement[]): string {
  const max = list.reduce((m, r) => Math.max(m, Number(r.id.replace(/\D/g, "")) || 0), 0);
  return `RTM-REQ-${String(max + 1).padStart(3, "0")}`;
}

export const newRequirement = (list: Requirement[], partial: Partial<Requirement> = {}): Requirement => ({
  id: nextRequirementId(list),
  description: "",
  source: "",
  objective: "",
  priority: "",
  acceptance_criterion: "",
  regulatory: false,
  work_package_ids: [],
  created_at: new Date().toISOString(),
  ...partial,
});

export const isRequirementDefined = (r: Requirement) =>
  [r.description, r.source, r.objective, r.acceptance_criterion].every(filled) && !!r.priority;

export interface Coverage {
  /** Requisitos sin paquete de trabajo: no se entregarían (hacia adelante). */
  uncovered: Requirement[];
  /** Paquetes sin requisito: trabajo no solicitado / gold plating (hacia atrás). */
  untraced: { id: string; code: string; name: string }[];
  complete: boolean;
}

export function coverage(p: Project): Coverage {
  const items = trackedItems(p);
  const ids = new Set(items.map((i) => i.id));
  const uncovered = p.requirements.filter((r) => !r.work_package_ids.some((w) => ids.has(w)));
  const linked = new Set(p.requirements.flatMap((r) => r.work_package_ids));
  const untraced = items.filter((i) => !linked.has(i.id)).map((i) => ({ id: i.id, code: i.code, name: i.name }));
  return { uncovered, untraced, complete: p.requirements.length > 0 && items.length > 0 && uncovered.length === 0 && untraced.length === 0 };
}

export type RequirementStatus = "Pendiente" | "En desarrollo" | "Verificado (QC)" | "Aceptado por el cliente";

/** Estado del requisito según sus paquetes (QC) y la aceptación formal de sus entregables. */
export function requirementStatus(p: Project, r: Requirement): RequirementStatus {
  const items = trackedItems(p).filter((i) => r.work_package_ids.includes(i.id));
  if (items.length === 0) return "Pendiente";
  const accepted = Object.values(p.closure?.acceptance ?? {}).some((a) => a.rtm_ids?.includes(r.id)) &&
    items.every((i) => !!p.closure?.acceptance[i.deliverableId]);
  if (accepted) return "Aceptado por el cliente";
  if (items.every((i) => progressOf(p, i.id).status === "Completado" && filled(progressOf(p, i.id).qc_verified_by))) return "Verificado (QC)";
  if (items.some((i) => progressOf(p, i.id).status !== "No iniciado")) return "En desarrollo";
  return "Pendiente";
}

/** Requisitos trazados a un entregable (a través de sus paquetes de trabajo). */
export function requirementsForDeliverable(p: Project, deliverableId: string): Requirement[] {
  const wpIds = new Set(trackedItems(p).filter((i) => i.deliverableId === deliverableId).map((i) => i.id));
  return p.requirements.filter((r) => r.work_package_ids.some((w) => wpIds.has(w)));
}
