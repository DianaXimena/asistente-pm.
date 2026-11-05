import type { Phase, Project } from "./types";

/** Plantilla de fases e insumos mínimos obligatorios (Motor de Fases). */
export function initialPhases(): Phase[] {
  return [
    {
      id: "inicio",
      phase_name: "Inicio",
      status: "En Progreso",
      progress_percentage: 0,
      mandatory_inputs: [
        { artifact_name: "Acta de Constitución", status: "No Iniciado", questionnaire: "acta-constitucion" },
        { artifact_name: "Registro de Interesados Inicial", status: "No Iniciado", questionnaire: "registro-interesados" },
      ],
    },
    {
      id: "planificacion",
      phase_name: "Planificación",
      status: "No Iniciada",
      progress_percentage: 0,
      mandatory_inputs: [
        { artifact_name: "Línea Base del Alcance (EDT + Diccionario)", status: "No Iniciado", questionnaire: "linea-base-alcance" },
        {
          artifact_name: "Línea Base del Cronograma",
          status: "No Iniciado",
          questionnaire: "linea-base-cronograma",
          requires: ["linea-base-alcance"],
        },
        {
          artifact_name: "Línea Base de Costos",
          status: "No Iniciado",
          questionnaire: "linea-base-costos",
          requires: ["linea-base-alcance", "registro-riesgos"],
        },
        { artifact_name: "Registro de Riesgos con Dueños", status: "No Iniciado", questionnaire: "registro-riesgos" },
      ],
    },
    {
      id: "ejecucion",
      phase_name: "Ejecución",
      status: "No Iniciada",
      progress_percentage: 0,
      mandatory_inputs: [
        { artifact_name: "Registro de Lecciones Aprendidas (Abierto)", status: "No Iniciado", questionnaire: "lecciones-aprendidas" },
        { artifact_name: "Asignación de Recursos", status: "No Iniciado", questionnaire: "asignacion-recursos" },
        { artifact_name: "Informes de Desempeño del Trabajo", status: "No Iniciado", questionnaire: "informe-desempeno" },
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
  ];
}

export function createProject(clientName: string, projectName: string): Project {
  const now = new Date();
  return {
    project_id: `PRJ-${now.getFullYear()}-${now.getTime().toString(36).slice(-5).toUpperCase()}`,
    client_name: clientName.trim(),
    project_name: projectName.trim(),
    created_at: now.toISOString(),
    approach: null,
    current_phase: "inicio",
    phases: initialPhases(),
    stakeholders: [],
    stakeholder_register_approved: false,
    risks: [],
    lessons: [],
    wp_progress: {},
    reports: [],
    impediments: [],
  };
}

/**
 * Completa proyectos guardados con versiones anteriores: agrega campos nuevos y
 * actualiza los insumos de cada fase con la plantilla vigente, conservando su estado.
 */
export function normalizeProject(p: Project): Project {
  const template = initialPhases();
  return {
    ...p,
    risks: p.risks ?? [],
    lessons: p.lessons ?? [],
    wp_progress: p.wp_progress ?? {},
    reports: p.reports ?? [],
    impediments: p.impediments ?? [],
    phases: template.map((tph) => {
      const stored = p.phases.find((x) => x.id === tph.id);
      if (!stored) return tph;
      return {
        ...stored,
        mandatory_inputs: tph.mandatory_inputs.map((ti) => {
          const si = stored.mandatory_inputs.find((x) => x.artifact_name === ti.artifact_name);
          return si ? { ...ti, status: si.status, source: si.source, file_name: si.file_name } : ti;
        }),
      };
    }),
  };
}
