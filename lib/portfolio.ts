import { todayIso } from "./audit";
import { evm, latestReport, progressOf, suggestedEv, suggestedPv, trackedItems } from "./execution";
import { bacFor } from "./governance";
import { num } from "./planning";
import type { Project } from "./types";

/**
 * Desempeño real frente a la línea base de medición del desempeño (alcance + cronograma + costo):
 * % planificado = PV / BAC a la fecha y % real = EV / BAC.
 * Con líneas base del asistente se calcula en vivo; si no, se usa el último informe de desempeño.
 */
export function performanceVsBaseline(p: Project) {
  const bac = bacFor(p);
  const last = latestReport(p);
  const health = last ? evm(last) : null;
  if (bac && p.schedule && p.costs) {
    const completed = trackedItems(p).filter((i) => progressOf(p, i.id).status === "Completado").map((i) => i.id);
    const pv = suggestedPv(p, todayIso());
    const ev = suggestedEv(p, completed);
    if (pv !== null && ev !== null) {
      return { planned: pv / bac, real: ev / bac, spi: pv > 0 ? ev / pv : null, cpi: health?.cpi ?? null, source: "Línea base en vivo" as const, bac, pv, ev };
    }
  }
  if (last && num(last.bac) > 0) {
    const b = num(last.bac);
    return { planned: num(last.pv) / b, real: num(last.ev) / b, spi: health?.spi ?? null, cpi: health?.cpi ?? null, source: "Último informe" as const, bac: b, pv: num(last.pv), ev: num(last.ev) };
  }
  return null;
}

export type Health = "Verde" | "Ámbar" | "Rojo";
export const indexHealth = (x: number): Health => (x >= 1 ? "Verde" : x >= 0.9 ? "Ámbar" : "Rojo");

/** Utilización de recursos: dedicación asignada y carga de paquetes por miembro del equipo. */
export function resourceUtilization(p: Project) {
  const members = p.resources?.members ?? [];
  const assignments = p.resources?.assignments ?? [];
  return members.map((m) => {
    const mine = assignments.filter((a) => a.responsible.includes(m.name) || a.accountable === m.name);
    const active = mine.filter((a) => progressOf(p, a.item_id).status === "En ejecución").length;
    return { name: m.name, role: m.role, allocation: num(m.allocation), assigned: mine.length, active };
  });
}
