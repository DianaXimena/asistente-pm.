import type { Approach, ApproachType, InitialDocType } from "./types";

// Algoritmo de Detección de Enfoque (documento "CODE-Gestión de Proyectos", sección 1).

export const RATIONALE: Record<ApproachType, string> = {
  Predictivo: "El alcance está completamente definido por adelantado; costo y tiempo están acotados.",
  Agil: "Alcance emergente; se fijan iteraciones de tiempo/costo y el alcance varía.",
  Hibrido: "Gobernanza contractual predictiva con entrega iterativa de componentes.",
};

export const DOC_TYPE_APPROACH: Record<Exclude<InitialDocType, "Otro">, ApproachType> = {
  "Contrato de Precio Fijo (FP)": "Predictivo",
  "SOW detallado": "Predictivo",
  "Pliego Técnico Cerrado": "Predictivo",
  "Backlog Inicial": "Agil",
  "Visión del Producto": "Agil",
  "Contrato T&M Ágil": "Agil",
  "Contrato Marco con Sprints": "Hibrido",
  "Acuerdo de Negocio con Fases Mixtas": "Hibrido",
};

export const DOC_TYPES = Object.keys(DOC_TYPE_APPROACH) as Exclude<InitialDocType, "Otro">[];

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[_\-.]+/g, " ");

/**
 * Sugiere el tipo de documento a partir del nombre del archivo.
 * El PM siempre confirma o corrige la sugerencia.
 */
export function suggestDocType(fileName: string): InitialDocType {
  const n = ` ${normalize(fileName)} `;
  // Híbrido primero, para no confundir "contrato marco" con otros contratos.
  if (/fases mixtas/.test(n)) return "Acuerdo de Negocio con Fases Mixtas";
  if (/\bmarco\b|\bsprints?\b/.test(n)) return "Contrato Marco con Sprints";
  if (/precio fijo|\bfp\b|fixed price/.test(n)) return "Contrato de Precio Fijo (FP)";
  if (/\bsow\b|statement of work/.test(n)) return "SOW detallado";
  if (/pliego/.test(n)) return "Pliego Técnico Cerrado";
  if (/backlog/.test(n)) return "Backlog Inicial";
  if (/vision/.test(n)) return "Visión del Producto";
  if (/\bt ?& ?m\b|\btym\b|time and material|tiempo y materiales/.test(n)) return "Contrato T&M Ágil";
  return "Otro";
}

export function approachFromDocType(docType: Exclude<InitialDocType, "Otro">): Approach {
  const type = DOC_TYPE_APPROACH[docType];
  return { type, rationale: RATIONALE[type], detected_from: docType };
}

/**
 * Micro-evaluador de 2 preguntas (sin certeza en el archivo inicial):
 * 1. ¿El alcance es estable desde el inicio? Sí → Predictivo | No → Ágil
 * 2. ¿Existen restricciones regulatorias o contractuales fijas de entrega? Sí → Híbrido/Predictivo
 * Combinación: alcance estable → Predictivo; alcance no estable con restricciones fijas → Híbrido;
 * alcance no estable sin restricciones → Ágil.
 */
export function approachFromMicroEvaluator(stableScope: boolean, fixedConstraints: boolean): Approach {
  const type: ApproachType = stableScope ? "Predictivo" : fixedConstraints ? "Hibrido" : "Agil";
  return { type, rationale: RATIONALE[type], detected_from: "Micro-evaluador (2 preguntas)" };
}
