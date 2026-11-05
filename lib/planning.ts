import type {
  CostBaseline,
  Deliverable,
  Project,
  Risk,
  RiskType,
  ScheduleBaseline,
  ScheduleItem,
  ScheduleMethod,
  ScopeBaseline,
  WorkPackage,
} from "./types";

// Reglas de Planificación según la guía PMP (PMBOK) y los documentos de diseño.

export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
const filled = (v: string) => v.trim().length > 0;
export const num = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/* ---------------- Alcance: Enunciado + EDT + Diccionario ---------------- */

export const EMPTY_SCOPE: ScopeBaseline = {
  product_description: "",
  acceptance_criteria: "",
  deliverables: [],
  exclusions: "",
  assumptions: "",
  constraints: "",
};

export const newWorkPackage = (): WorkPackage => ({ id: uid("WP"), name: "", description: "", owner: "", acceptance: "" });
export const newDeliverable = (): Deliverable => ({ id: uid("DEL"), name: "", work_packages: [newWorkPackage()] });

/** Código EDT jerárquico: 1, 1.1, 1.2, 2, 2.1… */
export const wbsCode = (d: number, w?: number) => (w === undefined ? `${d + 1}` : `${d + 1}.${w + 1}`);

export const isWorkPackageComplete = (w: WorkPackage) => [w.name, w.description, w.owner, w.acceptance].every(filled);

export function isScopeStepValid(step: number, s: ScopeBaseline): boolean {
  switch (step) {
    case 1:
      return filled(s.product_description) && filled(s.acceptance_criteria);
    case 2:
      return s.deliverables.length > 0 && s.deliverables.every((d) => filled(d.name));
    case 3:
      return s.deliverables.every((d) => d.work_packages.length > 0 && d.work_packages.every(isWorkPackageComplete));
    case 4:
      return filled(s.exclusions) && filled(s.assumptions) && filled(s.constraints);
    default:
      return false;
  }
}

export function workPackages(scope?: ScopeBaseline): { id: string; code: string; name: string }[] {
  if (!scope) return [];
  return scope.deliverables.flatMap((d, i) => d.work_packages.map((w, j) => ({ id: w.id, code: wbsCode(i, j), name: w.name })));
}

/* ---------------- Riesgos ---------------- */

export const STRATEGIES: Record<RiskType, { value: string; detail: string }[]> = {
  Amenaza: [
    { value: "Escalar", detail: "Fuera del alcance o la autoridad del PM" },
    { value: "Evitar", detail: "Eliminar la amenaza o proteger al proyecto" },
    { value: "Transferir", detail: "Trasladar la responsabilidad a un tercero" },
    { value: "Mitigar", detail: "Reducir la probabilidad o el impacto" },
    { value: "Aceptar", detail: "Reconocer el riesgo; activa o pasiva" },
  ],
  Oportunidad: [
    { value: "Escalar", detail: "Fuera del alcance o la autoridad del PM" },
    { value: "Explotar", detail: "Asegurar que la oportunidad ocurra" },
    { value: "Compartir", detail: "Asignar a quien mejor la capture" },
    { value: "Mejorar", detail: "Aumentar la probabilidad o el impacto" },
    { value: "Aceptar", detail: "Aprovecharla si ocurre, sin acción previa" },
  ],
};

export const RISK_OWNER_MESSAGE =
  "Un riesgo sin dueño no está gestionado; nadie estará a cargo de vigilar sus disparadores ni de ejecutar la respuesta planificada.";

export const newRisk = (): Risk => ({
  risk_id: uid("RSK"),
  cause: "",
  event: "",
  effect: "",
  type: "",
  probability: "",
  impact: "",
  strategy: "",
  response: "",
  owner: "",
});

export const riskStatement = (r: Risk) => `Debido a ${r.cause}, puede ocurrir ${r.event}, lo que provocaría ${r.effect}.`;

/** Valor Monetario Esperado = Probabilidad × Impacto. */
export const emv = (r: Risk) => (num(r.probability) / 100) * num(r.impact);

export function isRiskStepValid(step: number, r: Risk): boolean {
  switch (step) {
    case 1:
      return [r.cause, r.event, r.effect].every(filled);
    case 2: {
      const p = num(r.probability);
      return !!r.type && filled(r.probability) && p > 0 && p < 100 && num(r.impact) > 0;
    }
    case 3:
      return filled(r.strategy) && filled(r.response);
    case 4:
      return filled(r.owner);
    default:
      return false;
  }
}

export const isRiskComplete = (r: Risk) => [1, 2, 3, 4].every((s) => isRiskStepValid(s, r));

/** Reserva de Contingencia = Σ EMV (Amenazas) − Σ EMV (Oportunidades). */
export function contingencyFromRisks(risks: Risk[]): { threats: number; opportunities: number; total: number } {
  const threats = risks.filter((r) => r.type === "Amenaza").reduce((a, r) => a + emv(r), 0);
  const opportunities = risks.filter((r) => r.type === "Oportunidad").reduce((a, r) => a + emv(r), 0);
  return { threats, opportunities, total: Math.max(0, threats - opportunities) };
}

/* ---------------- Cronograma ---------------- */

/** PERT (Beta): (O + 4M + P) / 6, redondeado hacia arriba a días completos. */
export function itemDuration(item: ScheduleItem, method: ScheduleMethod): number {
  if (method === "Tres valores (PERT)") {
    return Math.ceil((num(item.optimistic) + 4 * num(item.most_likely) + num(item.pessimistic)) / 6);
  }
  return Math.ceil(num(item.most_likely));
}

export function isScheduleItemValid(item: ScheduleItem, method: ScheduleMethod): boolean {
  const m = num(item.most_likely);
  if (!(m > 0)) return false;
  if (method === "Estimación única") return true;
  const o = num(item.optimistic);
  const p = num(item.pessimistic);
  return o > 0 && p > 0 && o <= m && m <= p;
}

const parse = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const isWorkday = (d: Date) => d.getDay() !== 0 && d.getDay() !== 6;

/** Próximo día laborable (lunes a viernes) igual o posterior a la fecha. */
function nextWorkday(d: Date): Date {
  const x = new Date(d);
  while (!isWorkday(x)) x.setDate(x.getDate() + 1);
  return x;
}

/** Suma n días laborables (n ≥ 0). */
function addWorkdays(d: Date, n: number): Date {
  const x = new Date(d);
  let left = n;
  while (left > 0) {
    x.setDate(x.getDate() + 1);
    if (isWorkday(x)) left--;
  }
  return x;
}

export interface ScheduledItem extends ScheduleItem {
  duration: number;
  start: string;
  finish: string;
  critical: boolean;
}

/**
 * Pasada hacia adelante con dependencias fin-a-inicio y calendario lunes–viernes.
 * La ruta crítica es la cadena de predecesoras que termina en la fecha de fin más tardía.
 */
export function computeSchedule(s: ScheduleBaseline): { items: ScheduledItem[]; finish: string | null } {
  if (!s.start_date || s.items.length === 0) return { items: [], finish: null };
  const projectStart = nextWorkday(parse(s.start_date));
  const byId = new Map<string, ScheduledItem>();
  const out: ScheduledItem[] = [];
  for (const item of s.items) {
    const duration = Math.max(1, itemDuration(item, s.method));
    const pred = item.predecessor ? byId.get(item.predecessor) : undefined;
    const start = pred ? addWorkdays(parse(pred.finish), 1) : projectStart;
    const finish = addWorkdays(start, duration - 1);
    const row: ScheduledItem = { ...item, duration, start: toIso(start), finish: toIso(finish), critical: false };
    byId.set(item.id, row);
    out.push(row);
  }
  const last = out.reduce((a, b) => (b.finish > a.finish ? b : a));
  let cursor: ScheduledItem | undefined = last;
  while (cursor) {
    cursor.critical = true;
    cursor = cursor.predecessor ? byId.get(cursor.predecessor) : undefined;
  }
  return { items: out, finish: last.finish };
}

/* ---------------- Costos ---------------- */

export interface CostSummary {
  estimates: number;
  contingency: number;
  contingencySource: "riesgos" | "manual";
  costBaseline: number;
  managementReserve: number;
  totalBudget: number;
  actaLimit: number | null;
}

/**
 * Estimaciones + Reserva de Contingencia = Línea Base de Costos (PM)
 * Línea Base de Costos + Reserva de Gestión = Presupuesto Total (Dirección)
 */
export function costSummary(c: CostBaseline, project: Project): CostSummary {
  const estimates = c.items.reduce((a, i) => a + num(i.estimate), 0);
  const fromRisks = riskInputSource(project) !== "archivo";
  const contingency = fromRisks ? contingencyFromRisks(project.risks).total : num(c.manual_contingency);
  const costBaseline = estimates + contingency;
  const managementReserve = costBaseline * (num(c.management_reserve_pct) / 100);
  const limit = project.acta ? num(project.acta.budget) : 0;
  return {
    estimates,
    contingency,
    contingencySource: fromRisks ? "riesgos" : "manual",
    costBaseline,
    managementReserve,
    totalBudget: costBaseline + managementReserve,
    actaLimit: limit > 0 ? limit : null,
  };
}

export function riskInputSource(project: Project) {
  return project.phases.flatMap((p) => p.mandatory_inputs).find((i) => i.questionnaire === "registro-riesgos")?.source;
}

export function isCostStepValid(step: number, c: CostBaseline, project: Project): boolean {
  switch (step) {
    case 1:
      return !!c.method && c.items.length > 0 && c.items.every((i) => filled(i.name) && num(i.estimate) > 0);
    case 2:
      return riskInputSource(project) !== "archivo" || (filled(c.manual_contingency) && num(c.manual_contingency) >= 0);
    case 3: {
      const pct = num(c.management_reserve_pct);
      return filled(c.management_reserve_pct) && pct >= 0 && pct <= 100;
    }
    default:
      return false;
  }
}

export const usd = (n: number) =>
  `USD ${new Intl.NumberFormat("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
