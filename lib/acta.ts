import type { ActaFormData, Project } from "./types";

export const EMPTY_ACTA: ActaFormData = {
  business_case: "",
  pm_name: "",
  pm_authority: "",
  budget: "",
  currency: "USD",
  deadline: "",
  milestones: [],
  sponsor_name: "",
  sponsor_role: "",
  sponsor_email: "",
};

export const AUTHORITY_OPTIONS = [
  { value: "Baja", title: "Baja", detail: "Solo coordinar tareas · Matricial débil" },
  { value: "Media", title: "Media", detail: "Decidir sobre recursos asignados · Matricial equilibrada" },
  {
    value: "Alta",
    title: "Alta",
    detail: "Control directo sobre presupuesto y equipo · Proyectizada o Matricial fuerte",
  },
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (v: string) => EMAIL_RE.test(v.trim());
const filled = (v: string) => v.trim().length > 0;

/** Validación por paso (1–4). El botón "Siguiente" se habilita solo si el paso es válido. */
export function isStepValid(step: number, d: ActaFormData): boolean {
  switch (step) {
    case 1:
      return d.business_case.trim().length >= 10;
    case 2:
      return filled(d.pm_name) && d.pm_authority !== "";
    case 3:
      return Number(d.budget) > 0 && filled(d.deadline) && d.milestones.every((m) => filled(m.name) && filled(m.date));
    case 4:
      return filled(d.sponsor_name) && filled(d.sponsor_role) && isValidEmail(d.sponsor_email);
    default:
      return false;
  }
}

/** Campos obligatorios del Acta usados para el 70% del progreso de Inicio. */
export function actaCompletionRatio(d: ActaFormData | undefined): number {
  if (!d) return 0;
  const checks = [
    d.business_case.trim().length >= 10,
    filled(d.pm_name),
    d.pm_authority !== "",
    Number(d.budget) > 0,
    filled(d.deadline),
    filled(d.sponsor_name),
    filled(d.sponsor_role),
    isValidEmail(d.sponsor_email),
  ];
  return checks.filter(Boolean).length / checks.length;
}

/**
 * Progreso de Inicio según el documento de diseño:
 * Campos del Acta completados (70%) + Interesados identificados (30%).
 */
export function calcInicioProgress(project: Project): number {
  const acta = actaCompletionRatio(project.acta) * 70;
  const stakeholders = Math.max(0, Math.min(1, project.stakeholders_identified_ratio)) * 30;
  return Math.round(acta + stakeholders);
}

export function formatMoney(amount: string, currency: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  try {
    return new Intl.NumberFormat("es-EC", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString("es-EC")}`;
  }
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-EC", { day: "2-digit", month: "long", year: "numeric" });
}
