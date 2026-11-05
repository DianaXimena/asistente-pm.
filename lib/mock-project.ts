import type { Project } from "./types";

// Datos de demostración. Se reemplazarán por la persistencia real del proyecto.
// Nombre, ID y enfoque tomados del ejemplo JSON del documento de diseño.
export const mockProject: Project = {
  project_id: "PRJ-2026-001",
  project_name: "Modernización Core Bancario",
  approach: {
    type: "Hibrido",
    rationale: "Gobernanza contractual predictiva con desarrollo adaptativo por sprints",
    detected_from: "Contrato Marco con Sprints",
  },
  current_phase: "inicio",
  // Valor de demostración: 1/3 del registro de interesados → 30% × 1/3 = 10% de Inicio.
  stakeholders_identified_ratio: 1 / 3,
  phases: [
    {
      id: "inicio",
      phase_name: "Inicio",
      status: "En Progreso",
      progress_percentage: 10,
      mandatory_inputs: [
        { artifact_name: "Acta de Constitución", status: "No Iniciado", questionnaire: "acta-constitucion" },
        { artifact_name: "Registro de Interesados Inicial", status: "En Progreso" },
      ],
    },
    {
      id: "planificacion",
      phase_name: "Planificación",
      status: "No Iniciada",
      progress_percentage: 0,
      mandatory_inputs: [
        { artifact_name: "Línea Base del Alcance (EDT + Diccionario)", status: "No Iniciado" },
        { artifact_name: "Línea Base del Cronograma", status: "No Iniciado" },
        { artifact_name: "Línea Base de Costos", status: "No Iniciado" },
        { artifact_name: "Registro de Riesgos con Dueños", status: "No Iniciado", questionnaire: "registro-riesgos" },
      ],
    },
    {
      id: "ejecucion",
      phase_name: "Ejecución",
      status: "No Iniciada",
      progress_percentage: 0,
      mandatory_inputs: [
        { artifact_name: "Registro de Lecciones Aprendidas (Abierto)", status: "No Iniciado" },
        { artifact_name: "Asignación de Recursos", status: "No Iniciado" },
        { artifact_name: "Informes de Desempeño del Trabajo", status: "No Iniciado" },
      ],
    },
    {
      id: "control",
      phase_name: "Control",
      status: "No Iniciada",
      progress_percentage: 0,
      mandatory_inputs: [
        { artifact_name: "Registro mensual de CPI y SPI", status: "No Iniciado" },
        { artifact_name: "Registro de Incidentes", status: "No Iniciado" },
        { artifact_name: "Registro de Cambios (resoluciones CCB)", status: "No Iniciado", questionnaire: "solicitud-cambio" },
      ],
    },
    {
      id: "cierre",
      phase_name: "Cierre",
      status: "No Iniciada",
      progress_percentage: 0,
      mandatory_inputs: [
        { artifact_name: "Aceptación Formal del Cliente", status: "No Iniciado" },
        { artifact_name: "Cierre de Contratos", status: "No Iniciado" },
        { artifact_name: "Archivo de Lecciones Aprendidas", status: "No Iniciado" },
      ],
    },
  ],
};
