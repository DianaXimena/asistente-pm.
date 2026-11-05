import { approvalDateError } from "./audit";
import { crGovernance } from "./governance";
import { contingencyFromRisks, costSummary, num, riskInputSource, uid } from "./planning";
import type { BaselineId, ChangeImpact, ChangeRequest, Incident, Project, Risk } from "./types";

// Reglas de Control: documentos "Gestión de Proyectos 2" (riesgo → incidente),
// "Flujos Operativos PMBOK" y "Control de Cambios" (escalera de 9 peldaños).

const filled = (v: string) => v.trim().length > 0;
const today = () => new Date().toISOString().slice(0, 10);

/* ---------------- Incidentes ---------------- */

export const newIncident = (partial: Partial<Incident> = {}): Incident => ({
  id: uid("ISS"),
  title: "",
  description: "",
  severity: "",
  assigned_to: "",
  reported_date: today(),
  status: "Abierto",
  plan_sufficient: null,
  executed_action: "",
  contingency_used: "",
  baseline_impacted: false,
  resolution: "",
  ...partial,
});

/** Un riesgo materializado se convierte en incidente (no desaparece: transiciona). */
export const incidentFromRisk = (r: Risk): Incident =>
  newIncident({
    title: r.event,
    description: `Riesgo materializado: debido a ${r.cause}, ocurrió ${r.event}. Efecto: ${r.effect}.`,
    assigned_to: r.owner,
    derived_from_risk_id: r.risk_id,
    executed_action: r.response,
    status: "En resolución",
  });

export const isIncidentValid = (i: Incident) => filled(i.title) && filled(i.description) && !!i.severity && filled(i.assigned_to);

/** Reserva de contingencia disponible = reserva de la línea base − lo usado en incidentes. */
export function contingencyStatus(p: Project) {
  const reserve = p.costs ? costSummary(p.costs, p).contingency : riskInputSource(p) === "archivo" ? 0 : contingencyFromRisks(p.risks).total;
  const used = p.incidents.reduce((a, i) => a + num(i.contingency_used), 0);
  return { reserve, used, available: reserve - used };
}

/* ---------------- Solicitudes de cambio ---------------- */

export const EMPTY_IMPACT: ChangeImpact = {
  scope: "",
  schedule_days: "",
  critical_path: null,
  cost_amount: "",
  quality: "",
  resources: "",
  risks: "",
  benefits: "",
};

export const newChangeRequest = (partial: Partial<ChangeRequest> = {}): ChangeRequest => ({
  id: uid("CR"),
  what: "",
  requester: "",
  type: "",
  origin: "",
  written_file: "",
  regulatory: false,
  impact: EMPTY_IMPACT,
  consulted: "",
  conversation: "",
  alternative_found: null,
  alternative_detail: "",
  alternative_justification: "",
  baselines_affected: [],
  route: "",
  decision: "",
  decision_by: "",
  decision_date: "",
  decision_notes: "",
  communicated: false,
  status: "En análisis",
  created_at: new Date().toISOString(),
  ...partial,
});

export const VERBAL_MESSAGE = "La aprobación o solicitud verbal no es válida. Debe registrarse formalmente por escrito.";
export const INCOMPLETE_IMPACT_MESSAGE = "Evaluación incompleta: debes analizar todas las restricciones antes de proponer soluciones.";
export const REPLAN_MESSAGE =
  "Línea base modificada. No continúes ejecutando con el plan antiguo: debes actualizar la EDT, el cronograma y el presupuesto antes de volver a la ejecución.";

/** Las 7 dimensiones del impacto integral deben contener una evaluación. */
export function impactDimensions(i: ChangeImpact) {
  return [
    { k: "Alcance", ok: filled(i.scope) },
    { k: "Cronograma", ok: filled(i.schedule_days) && i.critical_path !== null },
    { k: "Costo", ok: filled(i.cost_amount) },
    { k: "Calidad", ok: filled(i.quality) },
    { k: "Recursos", ok: filled(i.resources) },
    { k: "Riesgos", ok: filled(i.risks) },
    { k: "Beneficios / Caso de negocio", ok: filled(i.benefits) },
  ];
}

export const REGULATORY_MESSAGE =
  "Requisito regulatorio o legal: no se negocia, el CCB no puede rechazarlo ni diferirlo y no admite alternativas que eviten el ajuste. Acción obligatoria: ajustar la línea base y escalar formalmente.";

/**
 * Enrutamiento de gobernanza (hallazgos 3 y 4):
 * - Regulatorio/legal → escalamiento obligatorio a CCB / gobernanza.
 * - Costo como % del BAC: dentro de la tolerancia decide el PM; sobre la tolerancia decide el PM
 *   e informa al Patrocinador; sobre el umbral de escalamiento, escalamiento obligatorio.
 * - Cronograma: se mantiene el límite de días de la autoridad delegada del PM.
 */
export function routeFor(cr: ChangeRequest, p: Project): { route: "PM" | "CCB"; reason: string; escalation_mandatory: boolean } | null {
  if (cr.regulatory) return { route: "CCB", reason: "Requisito regulatorio o legal: escalamiento formal obligatorio.", escalation_mandatory: true };
  const gov = crGovernance(cr, p);
  const days = p.pm_authority_limit?.days ?? "";
  if (!gov || !filled(days)) return null;
  if (gov.escalation_mandatory)
    return { route: "CCB", reason: `El costo equivale al ${gov.cost_deviation_pct}% del BAC: supera el umbral de escalamiento.`, escalation_mandatory: true };
  if (num(cr.impact.schedule_days) > num(days))
    return { route: "CCB", reason: `El impacto de ${cr.impact.schedule_days} días supera el límite de ${days} días del PM.`, escalation_mandatory: true };
  return {
    route: "PM",
    reason:
      gov.band === "Sobre tolerancia"
        ? `El costo equivale al ${gov.cost_deviation_pct}% del BAC: sobre la tolerancia, decide el PM e informa al Patrocinador.`
        : `El costo equivale al ${gov.cost_deviation_pct}% del BAC: dentro de la tolerancia operativa del PM.`,
    escalation_mandatory: false,
  };
}

export const BASELINE_LABEL: Record<BaselineId, string> = {
  "linea-base-alcance": "Alcance (EDT)",
  "linea-base-cronograma": "Cronograma",
  "linea-base-costos": "Costos (presupuesto)",
};

export function isCrStepValid(step: number, cr: ChangeRequest, p: Project): boolean {
  switch (step) {
    case 1:
      return filled(cr.what) && filled(cr.requester) && !!cr.type && cr.origin === "Escrito" && filled(cr.written_file);
    case 2:
      return impactDimensions(cr.impact).every((d) => d.ok);
    case 3:
      return filled(cr.consulted) && filled(cr.conversation);
    case 4:
      if (cr.regulatory) return true;
      return cr.alternative_found === true ? filled(cr.alternative_detail) : cr.alternative_found === false && filled(cr.alternative_justification);
    case 5: {
      if (!routeFor(cr, p)) return false;
      if (!cr.decision || !filled(cr.decision_by) || !cr.decision_date) return false;
      if (approvalDateError(cr.decision_date, { date: cr.created_at, label: "la creación de la solicitud" })) return false;
      if (cr.regulatory && cr.decision !== "Aprobada") return false;
      if (!cr.regulatory && crGovernance(cr, p)?.band === "Sobre tolerancia" && routeFor(cr, p)?.route === "PM" && !cr.sponsor_informed) return false;
      return cr.decision !== "Rechazada" || filled(cr.decision_notes);
    }
    case 6:
      // Regulatorio: el ajuste de la línea base es obligatorio.
      return !cr.regulatory || cr.baselines_affected.length > 0;
    case 7:
      return cr.communicated;
    default:
      return false;
  }
}

export const isCrOpen = (cr: ChangeRequest) => cr.status === "En análisis" || cr.status === "Pendiente de decisión";
