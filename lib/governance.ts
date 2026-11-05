import { baselineBac } from "./execution";
import { num } from "./planning";
import type { ChangeRequest, GovernanceBand, PerformanceReport, Project } from "./types";

// Hallazgo 3 · Gobernanza: Tolerancia operativa vs. Umbral de escalamiento (solo costo).

/** BAC de referencia: Línea Base de Costos aprobada o, si se cargó como archivo, el BAC ingresado. */
export function bacFor(p: Project): number | null {
  const b = baselineBac(p);
  if (b) return b;
  const ref = num(p.bac_reference ?? "");
  return ref > 0 ? ref : null;
}

export function bandFor(pct: number, p: Project): { band: GovernanceBand; escalation_mandatory: boolean } {
  const { cost_tolerance_percentage: tol, cost_escalation_threshold_percentage: thr } = p.governance_thresholds;
  if (pct > thr) return { band: "Sobre umbral de escalamiento", escalation_mandatory: true };
  if (pct > tol) return { band: "Sobre tolerancia", escalation_mandatory: false };
  return { band: "Dentro de tolerancia", escalation_mandatory: false };
}

export const BAND_GUIDANCE: Record<GovernanceBand, string> = {
  "Dentro de tolerancia": "El PM lo gestiona operativamente: no requiere escalar.",
  "Sobre tolerancia": "Fuera de la tolerancia operativa: el PM toma acción correctiva e informa al Patrocinador; el escalamiento aún no es obligatorio.",
  "Sobre umbral de escalamiento": "Supera el umbral de escalamiento: el escalamiento formal a gobernanza es obligatorio.",
};

/** Desviación de costo de una Solicitud de Cambio como % del BAC. */
export function crGovernance(cr: ChangeRequest, p: Project) {
  const bac = bacFor(p);
  if (!bac) return null;
  const pct = Math.round((num(cr.impact.cost_amount) / bac) * 1000) / 10;
  return { cost_deviation_pct: pct, ...bandFor(pct, p) };
}

/** Desviación de costo del informe EVM: sobrecosto actual CV% = (AC − EV) / EV. */
export function evmGovernance(r: Pick<PerformanceReport, "ev" | "ac">, p: Project) {
  const ev = num(r.ev);
  const ac = num(r.ac);
  if (!(ev > 0)) return null;
  const pct = Math.round(((ac - ev) / ev) * 1000) / 10;
  return { cost_deviation_pct: pct, ...bandFor(Math.max(0, pct), p) };
}
