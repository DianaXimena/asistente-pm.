import { progressOf, trackedItems } from "./execution";
import type { Closure, Contract, DeliverableAcceptance, Project } from "./types";

// Reglas de Cierre: documentos "Cierre y Reservas PM" y "Flujos Operativos PMBOK".

const filled = (v: string) => v.trim().length > 0;

export const EMPTY_CLOSURE: Closure = {
  acceptance: {},
  contracts: [],
  contracts_confirmed: false,
  final_cost: "",
  docs_archived: false,
  resources_released: false,
  lesson_tags: {},
  opa_folder: "",
  retrospective_date: "",
  retrospective_participants: "",
  lessons_archived: false,
};

export const closureOf = (p: Project): Closure => ({ ...EMPTY_CLOSURE, ...(p.closure ?? {}) });

export interface DeliverableRow {
  id: string;
  name: string;
  /** Controlar la Calidad: todos sus paquetes completados y verificados. */
  verified: boolean;
  acceptance?: DeliverableAcceptance;
  accepted: boolean;
}

export const isAcceptanceComplete = (a?: DeliverableAcceptance) =>
  !!a && [a.accepted_by, a.acceptance_date, a.acceptance_file, a.ops_owner, a.maintenance_plan, a.benefit_metrics].every(filled);

export function deliverableRows(p: Project): DeliverableRow[] {
  const groups = new Map<string, { name: string; ids: string[] }>();
  for (const it of trackedItems(p)) {
    const g = groups.get(it.deliverableId) ?? { name: it.deliverableName, ids: [] };
    g.ids.push(it.id);
    groups.set(it.deliverableId, g);
  }
  const c = closureOf(p);
  return [...groups.entries()].map(([id, g]) => {
    const verified = g.ids.every((x) => {
      const pr = progressOf(p, x);
      return pr.status === "Completado" && filled(pr.qc_verified_by);
    });
    const acceptance = c.acceptance[id];
    return { id, name: g.name, verified, acceptance, accepted: verified && isAcceptanceComplete(acceptance) };
  });
}

export const isContractClosed = (k: Contract) =>
  filled(k.name) && filled(k.supplier) && k.deliverables_ok && k.final_payment && k.audit_done && k.open_claims === false && filled(k.closure_file);

export const isAdminClosed = (c: Closure) => filled(c.final_cost) && c.docs_archived && c.resources_released;

export function closureStats(p: Project) {
  const rows = deliverableRows(p);
  const c = closureOf(p);
  const accepted = rows.length ? rows.filter((r) => r.accepted).length / rows.length : 0;
  const contracts = c.contracts_confirmed ? (c.contracts.length ? c.contracts.filter(isContractClosed).length / c.contracts.length : 1) : 0;
  const archived = c.lessons_archived ? 1 : 0;
  return {
    rows,
    accepted,
    contracts,
    archived,
    /** (Entregables Aceptados + Contratos Cerrados + Lecciones Archivadas) / 3 × 100 */
    progress: Math.round(((accepted + contracts + archived) / 3) * 100),
  };
}

export const ORG_TAGS = ["Adquisiciones", "Estimación", "Tecnología", "Comunicación", "Riesgos", "Calidad", "Recursos", "Interesados"];
