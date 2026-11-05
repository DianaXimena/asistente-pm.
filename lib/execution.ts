import { computeSchedule, costSummary, num, usd, workPackages } from "./planning";
import { isIdentified, quadrant } from "./stakeholders";
import type { Impediment, KnowledgeArea, Lesson, PerformanceReport, Project, Stakeholder, WpProgress } from "./types";

// Reglas de Ejecución: documentos "CODE-Gestión de Proyectos", "Informes de Desempeño",
// "Matriz de Comunicaciones", "Flujos Operativos PMBOK" y "Control de Cambios".

export const KNOWLEDGE_AREAS: KnowledgeArea[] = [
  "Integración",
  "Alcance",
  "Cronograma",
  "Costos",
  "Calidad",
  "Recursos",
  "Comunicaciones",
  "Riesgos",
  "Adquisiciones",
  "Interesados",
];

/* ---------------- Elementos a ejecutar ---------------- */

export interface TrackedItem {
  id: string;
  code: string;
  name: string;
  deliverableId: string;
  deliverableName: string;
}

/**
 * Paquetes de trabajo que se ejecutan: la EDT del asistente; si se cargó como archivo,
 * los ítems del cronograma o de costos. Sin EDT, cada ítem cuenta como su propio entregable.
 */
export function trackedItems(p: Project): TrackedItem[] {
  if (p.scope && p.scope.deliverables.length > 0) {
    return p.scope.deliverables.flatMap((d, i) =>
      d.work_packages.map((w, j) => ({ id: w.id, code: `${i + 1}.${j + 1}`, name: w.name, deliverableId: d.id, deliverableName: d.name })),
    );
  }
  const items = p.schedule?.items.length ? p.schedule.items : (p.costs?.items ?? []);
  return items.map((it, i) => ({ id: it.id, code: `${i + 1}`, name: it.name, deliverableId: it.id, deliverableName: it.name }));
}

export const EMPTY_PROGRESS: WpProgress = { status: "No iniciado", qc_verified_by: "", qc_date: "" };
export const progressOf = (p: Project, id: string) => p.wp_progress[id] ?? EMPTY_PROGRESS;

export interface ExecutionStats {
  total: number;
  started: number;
  completed: number;
  deliverables: number;
  deliverablesCompleted: number;
  /** (% paquetes en ejecución + % entregables completados) / 2 */
  progress: number;
}

export function executionStats(p: Project): ExecutionStats {
  const items = trackedItems(p);
  const started = items.filter((i) => progressOf(p, i.id).status !== "No iniciado").length;
  const completed = items.filter((i) => progressOf(p, i.id).status === "Completado").length;
  const groups = new Map<string, TrackedItem[]>();
  items.forEach((i) => groups.set(i.deliverableId, [...(groups.get(i.deliverableId) ?? []), i]));
  const deliverablesCompleted = [...groups.values()].filter((g) => g.every((i) => progressOf(p, i.id).status === "Completado")).length;
  const pctStarted = items.length ? started / items.length : 0;
  const pctDeliv = groups.size ? deliverablesCompleted / groups.size : 0;
  return {
    total: items.length,
    started,
    completed,
    deliverables: groups.size,
    deliverablesCompleted,
    progress: Math.round(((pctStarted + pctDeliv) / 2) * 100),
  };
}

/* ---------------- Lecciones aprendidas ---------------- */

export const isLessonComplete = (l: Lesson) =>
  !!l.type && !!l.area && [l.situation, l.impact, l.recommendation, l.recorded_by].every((v) => v.trim().length > 0);

/* ---------------- Valor ganado (EVM) ---------------- */

const parse = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
function workdaysBetween(a: Date, b: Date): number {
  // Días laborables desde a hasta b, ambos inclusive (0 si b < a).
  if (b < a) return 0;
  let n = 0;
  const x = new Date(a);
  while (x <= b) {
    if (x.getDay() !== 0 && x.getDay() !== 6) n++;
    x.setDate(x.getDate() + 1);
  }
  return n;
}

/** BAC = Línea Base de Costos (si se definió con el cuestionario). */
export function baselineBac(p: Project): number | null {
  if (!p.costs) return null;
  const v = costSummary(p.costs, p).costBaseline;
  return v > 0 ? v : null;
}

function costWeights(p: Project): Map<string, number> | null {
  if (!p.costs) return null;
  const m = new Map(p.costs.items.map((i) => [i.id, num(i.estimate)]));
  const total = [...m.values()].reduce((a, b) => a + b, 0);
  return total > 0 ? m : null;
}

/**
 * PV sugerido a la fecha de corte: BAC × fracción planificada según el cronograma,
 * ponderada por el costo de cada paquete (distribución lineal en días laborables).
 */
export function suggestedPv(p: Project, cutoff: string): number | null {
  const bac = baselineBac(p);
  const weights = costWeights(p);
  if (!bac || !weights || !p.schedule || !cutoff) return null;
  const sched = computeSchedule(p.schedule).items;
  if (sched.length === 0) return null;
  const total = [...weights.values()].reduce((a, b) => a + b, 0);
  const c = parse(cutoff);
  let planned = 0;
  for (const it of sched) {
    const w = weights.get(it.id);
    if (!w) continue;
    const done = workdaysBetween(parse(it.start), c < parse(it.finish) ? c : parse(it.finish));
    planned += w * Math.min(1, done / it.duration);
  }
  return bac * (planned / total);
}

/** EV sugerido con la regla 0/100: solo los paquetes completados aportan su presupuesto. */
export function suggestedEv(p: Project, completedIds: string[]): number | null {
  const bac = baselineBac(p);
  const weights = costWeights(p);
  if (!bac || !weights) return null;
  const total = [...weights.values()].reduce((a, b) => a + b, 0);
  const earned = completedIds.reduce((a, id) => a + (weights.get(id) ?? 0), 0);
  return bac * (earned / total);
}

export type HealthColor = "Verde" | "Ámbar" | "Rojo";

export interface EvmResult {
  cpi: number;
  spi: number;
  cv: number;
  sv: number;
  eac: number;
  vac: number;
  color: HealthColor;
  message: string;
  summary: string;
}

export const AMBER_MESSAGE = "Desviación moderada detectada. Analizar causas raíz y monitorear tendencias.";
export const RED_MESSAGE =
  "El proyecto está en sobrecosto o retraso severo. Obligatorio: 1) Evaluar pronósticos de finalización (EAC); 2) Registrar un incidente o evaluar solicitud de cambio/acción correctiva formal.";

export function evm(r: Pick<PerformanceReport, "pv" | "ev" | "ac" | "bac">): EvmResult | null {
  const pv = num(r.pv);
  const ev = num(r.ev);
  const ac = num(r.ac);
  const bac = num(r.bac);
  if (!(pv > 0 && ac > 0 && bac > 0) || ev < 0) return null;
  const cpi = ev / ac;
  const spi = ev / pv;
  const eac = cpi > 0 ? bac / cpi : Infinity;
  const vac = bac - eac;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const color: HealthColor = cpi < 0.9 || spi < 0.9 ? "Rojo" : cpi < 1 || spi < 1 ? "Ámbar" : "Verde";
  const sched = spi < 1 ? `un retraso de ${Math.round((1 - spi) * 100)}%` : spi > 1 ? `un adelanto de ${Math.round((spi - 1) * 100)}%` : "el cronograma al día";
  const cost = cpi < 1 ? `un sobrecosto de ${Math.round((1 / cpi - 1) * 100)}%` : cpi > 1 ? `un ahorro de ${Math.round((1 - 1 / cpi) * 100)}%` : "el costo según lo planificado";
  const summary = `El proyecto presenta ${sched} (SPI ${r2(spi)}) y ${cost} (CPI ${r2(cpi)}). Proyección final (EAC): ${
    Number.isFinite(eac) ? usd(eac) : "no calculable"
  }; variación al cierre (VAC): ${Number.isFinite(vac) ? usd(vac) : "no calculable"}.`;
  return {
    cpi: r2(cpi),
    spi: r2(spi),
    cv: ev - ac,
    sv: ev - pv,
    eac,
    vac,
    color,
    message: color === "Rojo" ? RED_MESSAGE : color === "Ámbar" ? AMBER_MESSAGE : "Rendimiento conforme a presupuesto y cronograma.",
    summary,
  };
}

export const latestReport = (p: Project) => [...p.reports].sort((a, b) => b.period.localeCompare(a.period))[0];

/** Periodo (YYYY-MM) cuyo informe es obligatorio hoy, o null si aún no corresponde. */
export function requiredReportPeriod(p: Project, today = new Date()): string | null {
  if (!p.execution_started_at || p.closure?.closed_at) return null;
  const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const period = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const started = new Date(p.execution_started_at);
  // Solo si la ejecución ya estaba en curso durante el mes anterior.
  if (started >= new Date(today.getFullYear(), today.getMonth(), 1)) return null;
  // A partir del primer día hábil del mes.
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  while (first.getDay() === 0 || first.getDay() === 6) first.setDate(first.getDate() + 1);
  if (today < first) return null;
  return p.reports.some((r) => r.period === period) ? null : period;
}

/* ---------------- Distribución Push / Pull ---------------- */

export interface Recipient {
  stakeholder: Stakeholder;
  method: string;
  suggested: boolean;
  reason: string;
}

export function suggestedRecipients(p: Project, health: EvmResult | null): Recipient[] {
  const critical = !!health && (health.cpi < 0.9 || health.spi < 0.9);
  return p.stakeholders
    .filter((s) => isIdentified(s))
    .map((s) => {
      const q = quadrant(s.power, s.interest);
      const method = q?.method ?? "—";
      if (method === "Push Activo") return { stakeholder: s, method, suggested: true, reason: "Alto poder y alto interés: envío mensual" };
      if (method === "Push Condicional")
        return {
          stakeholder: s,
          method,
          suggested: critical,
          reason: critical ? "CPI o SPI < 0.90: se activa el envío por excepción" : "Solo si CPI/SPI < 0.90 o cambio de línea base",
        };
      return { stakeholder: s, method, suggested: false, reason: "Consulta el tablero (Pull)" };
    });
}

/* ---------------- Impedimentos ---------------- */

export const LEVELS: { level: 1 | 2 | 3 | 4; question: string; action: string }[] = [
  { level: 1, question: "¿El equipo puede resolverlo solo?", action: "Empoderar y dar apoyo (no intervenir)" },
  { level: 2, question: "¿Está en la autoridad directa del PM removerlo?", action: "El PM lo remueve (destraba dependencias, negocia)" },
  { level: 3, question: "¿Involucra a otro interesado, proveedor u otra área?", action: "Colaborar y negociar con el interesado" },
  { level: 4, question: "¿Supera el umbral de gobernanza?", action: "Escalar formalmente con análisis de impacto" },
];

export const RECURRENCE_MESSAGE =
  "Registrar un impedimento no es resolverlo. Este bloqueo es recurrente: se requiere reevaluar el proceso de fondo o subir de nivel en la escala de intervención.";

export const isRecurring = (i: Impediment) => i.status === "Abierto" && i.reviews > 2;

export function isOverdue(i: Impediment, today = new Date()): boolean {
  if (i.status !== "Abierto" || !i.due_date) return false;
  return parse(i.due_date) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

/** Licencia de escalamiento: intentos previos en niveles 1–3, o impacto sobre el umbral configurado. */
export function canEscalate(i: Impediment, p: Project): { allowed: boolean; reason: string } {
  const tried = i.attempts.some((a) => a.level <= 3);
  const t = p.escalation_threshold;
  const overAmount = !!t && num(t.amount) > 0 && num(i.impact_amount) > num(t.amount);
  const overDays = !!t && num(t.days) > 0 && num(i.impact_days) > num(t.days);
  if (tried) return { allowed: true, reason: "Hay intentos previos registrados en los niveles 1 a 3." };
  if (overAmount || overDays) return { allowed: true, reason: "El impacto supera el umbral de escalamiento del proyecto." };
  return { allowed: false, reason: "Registra un intento en los niveles 1 a 3, o un impacto que supere el umbral de escalamiento." };
}
