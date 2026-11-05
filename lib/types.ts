// Modelo de datos del asistente, alineado con la "Estructura de Base de Datos JSON Integrada"
// del documento de diseño (CODE-Gestión de Proyectos).

export type ApproachType = "Predictivo" | "Agil" | "Hibrido";

export type PhaseId = "inicio" | "planificacion" | "ejecucion" | "control" | "cierre";

export type PhaseStatus = "Completada" | "En Progreso" | "Bloqueada" | "No Iniciada";

export type InputStatus = "Aprobado" | "Pendiente de Firma" | "En Progreso" | "No Iniciado";

/** Cuestionarios cortos definidos en el diseño (4–5 preguntas cada uno). */
export type QuestionnaireId = "acta-constitucion" | "registro-riesgos" | "solicitud-cambio";

export interface MandatoryInput {
  artifact_name: string;
  status: InputStatus;
  /** Si el insumo se genera con un cuestionario guiado del asistente. */
  questionnaire?: QuestionnaireId;
}

export interface Phase {
  id: PhaseId;
  phase_name: string;
  status: PhaseStatus;
  progress_percentage: number;
  mandatory_inputs: MandatoryInput[];
}

export interface Project {
  project_id: string;
  project_name: string;
  approach: {
    type: ApproachType;
    rationale: string;
    detected_from: string;
  };
  current_phase: PhaseId;
  phases: Phase[];
}

/** Semáforo visual del motor de fases: Verde completo, Ámbar pendiente, Rojo bloqueante. */
export type Semaforo = "verde" | "ambar" | "rojo" | "neutro";
