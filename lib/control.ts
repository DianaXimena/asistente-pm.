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

/**
 * Enrutamiento de gobernanza: dentro de la autoridad del PM decide el PM;
 * si supera el umbral de costo o de días, o es regulatorio, va a CCB / gobernanza.
 */
export function routeFor(cr: ChangeRequest, p: Project): { route: "PM" | "CCB"; reason: string } | null {
  const lim = p.pm_authority_limit;
  if (cr.regulatory) return { route: "CCB", reason: "Cumplimiento regulatorio: se escala formalmente para ajustar los parámetros del proyecto." };
  if (!lim || !filled(lim.amount) || !filled(lim.days)) return null;
  const overCost = num(cr.impact.cost_amount) > num(lim.amount);
  const overDays = num(cr.impact.schedule_days) > num(lim.days);
  if (overCost || overDays)
    return { route: "CCB", reason: `Supera la autoridad del PM (${overCost ? "costo" : ""}${overCost && overDays ? " y " : ""}${overDays ? "días" : ""}).` };
  return { route: "PM", reason: "Dentro de la autoridad delegada del PM." };
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
      return cr.alternative_found === true ? filled(cr.alternative_detail) : cr.alternative_found === false && filled(cr.alternative_justification);
    case 5: {
      if (!routeFor(cr, p)) return false;
      if (!cr.decision || !filled(cr.decision_by) || !cr.decision_date) return false;
      if (cr.regulatory && cr.decision !== "Aprobada") return false;
      return cr.decision !== "Rechazada" || filled(cr.decision_notes);
    }
    case 6:
      return true;
    case 7:
      return cr.communicated;
    default:
      return false;
  }
}

export const isCrOpen = (cr: ChangeRequest) => cr.status === "En análisis" || cr.status === "Pendiente de decisión";
