import type { EngagementLevel, Level, Stakeholder } from "./types";

// Flujo de 3 niveles (documento "Cierre y Reservas PM", sección 3) y
// enrutamiento Push/Pull (documento "Matriz de Comunicaciones").

export const ENGAGEMENT_LEVELS: { value: EngagementLevel; label: string; code: string }[] = [
  { value: "Desconocedor", label: "Desconocedor", code: "U" },
  { value: "Resistente", label: "Resistente", code: "R" },
  { value: "Neutral", label: "Neutral", code: "N" },
  { value: "Partidario", label: "Partidario", code: "S" },
  { value: "Lider", label: "Líder", code: "L" },
];

export const engagementLabel = (v: EngagementLevel | "") =>
  ENGAGEMENT_LEVELS.find((l) => l.value === v)?.label ?? "—";

export interface QuadrantInfo {
  strategy: string;
  detail: string;
  method: string;
  channel: string;
}

export function quadrant(power: Level | "", interest: Level | ""): QuadrantInfo | null {
  if (!power || !interest) return null;
  if (power === "Alto" && interest === "Alto")
    return {
      strategy: "Gestionar de Cerca",
      detail: "Involucrar activamente",
      method: "Push Activo",
      channel: "Correo directo con PDF ejecutivo, mensual",
    };
  if (power === "Alto")
    return {
      strategy: "Mantener Satisfecho",
      detail: "Consultas y revisiones clave",
      method: "Push Condicional",
      channel: "Solo si CPI/SPI < 0.90 o cambio de línea base aprobado",
    };
  if (interest === "Alto")
    return {
      strategy: "Mantener Informado",
      detail: "Reportes periódicos y avisos",
      method: "Pull",
      channel: "Tablero de solo lectura con aviso de nueva versión",
    };
  return {
    strategy: "Monitorear",
    detail: "Esfuerzo mínimo",
    method: "Pull Pasivo",
    channel: "Repositorio archivado, sin notificaciones",
  };
}

const rank = (v: EngagementLevel | "") => ENGAGEMENT_LEVELS.findIndex((l) => l.value === v);

/** Brecha negativa: el nivel actual está por debajo del deseado. */
export function hasEngagementGap(s: Stakeholder): boolean {
  return !!s.current_level && !!s.desired_level && rank(s.current_level) < rank(s.desired_level);
}

/** Alerta de Involucramiento Prioritario: interesado de Alto Poder con brecha negativa. */
export function needsPriorityEngagement(s: Stakeholder): boolean {
  return s.power === "Alto" && hasEngagementGap(s);
}

export const isValidOptionalEmail = (v: string) => v.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export const isIdentified = (s: Stakeholder) =>
  [s.name, s.organization, s.role, s.expectation].every((v) => v.trim().length > 0);

/** Interesado completo: identificado, clasificado (Poder/Interés) y con involucramiento evaluado. */
export function isStakeholderComplete(s: Stakeholder): boolean {
  return (
    isIdentified(s) &&
    !!s.power &&
    !!s.interest &&
    !!s.current_level &&
    !!s.desired_level &&
    (!hasEngagementGap(s) || s.action_plan.trim().length > 0)
  );
}

/** Proporción de interesados completos (insumo del 30% del progreso de Inicio). */
export function stakeholdersRatio(list: Stakeholder[]): number {
  if (list.length === 0) return 0;
  return list.filter(isStakeholderComplete).length / list.length;
}

export function newStakeholder(partial: Partial<Stakeholder> = {}): Stakeholder {
  return {
    stakeholder_id: `STK-${Date.now().toString(36).toUpperCase()}`,
    name: "",
    organization: "",
    role: "",
    expectation: "",
    email: "",
    power: "",
    interest: "",
    current_level: "",
    desired_level: "",
    action_plan: "",
    ...partial,
  };
}
