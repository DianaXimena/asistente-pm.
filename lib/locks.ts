import { lastAudit } from "./audit";
import type { BaselineId, Project, QuestionnaireId } from "./types";

// Hallazgo 2 · Integridad: lo aprobado no se reescribe; solo cambia por Control de Cambios.

const BASELINES: QuestionnaireId[] = ["matriz-trazabilidad", "linea-base-alcance", "linea-base-cronograma", "linea-base-costos"];

export interface LockInfo {
  locked: boolean;
  reason: string;
  approvedAt?: string;
  viaChange?: boolean;
}

export function lockInfo(p: Project, q: QuestionnaireId): LockInfo {
  const input = p.phases.flatMap((ph) => ph.mandatory_inputs).find((i) => i.questionnaire === q);
  const plan = p.phases.find((ph) => ph.id === "planificacion");
  if (BASELINES.includes(q) && plan?.status === "Completada") {
    const reopened =
      !!p.replanning &&
      (p.replanning.baselines.includes(q as BaselineId) || (q === "matriz-trazabilidad" && p.replanning.baselines.includes("linea-base-alcance")));
    if (!reopened)
      return {
        locked: true,
        viaChange: true,
        approvedAt: lastAudit(p, "Línea base", q)?.at ?? lastAudit(p, "Fase", "planificacion")?.at,
        reason: "Línea base aprobada y congelada. Solo puede modificarse mediante una Solicitud de Cambio aprobada.",
      };
  }
  if (q === "acta-constitucion" && input?.status === "Aprobado")
    return { locked: true, approvedAt: lastAudit(p, "Acta de Constitución")?.at, reason: "Acta firmada por el Patrocinador: no se puede editar." };
  if (q === "archivo-lecciones" && p.closure?.lessons_archived)
    return { locked: true, approvedAt: lastAudit(p, "Archivo de lecciones")?.at, reason: "Lecciones archivadas como OPA: registro cerrado." };
  if (q === "cierre-contratos" && input?.status === "Aprobado")
    return { locked: true, approvedAt: lastAudit(p, "Cierre de contratos")?.at, reason: "Contratos y cierre administrativo registrados: no se pueden editar." };
  if (p.closure?.closed_at) return { locked: true, approvedAt: p.closure.closed_at, reason: "Proyecto cerrado: los registros son de solo lectura." };
  return { locked: false, reason: "" };
}
