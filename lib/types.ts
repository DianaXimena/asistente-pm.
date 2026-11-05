// Modelo de datos del asistente, alineado con la "Estructura de Base de Datos JSON Integrada"
// de los documentos de diseño.

export type ApproachType = "Predictivo" | "Agil" | "Hibrido";

export type PhaseId = "inicio" | "planificacion" | "ejecucion" | "control" | "cierre";

export type PhaseStatus = "Completada" | "En Progreso" | "Bloqueada" | "No Iniciada";

export type InputStatus = "Aprobado" | "Pendiente de Firma" | "En Progreso" | "No Iniciado";

/** Cuestionarios cortos guiados por el asistente. */
export type QuestionnaireId = "acta-constitucion" | "registro-interesados" | "registro-riesgos" | "solicitud-cambio";

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

/** Tipos de documento inicial reconocidos por el algoritmo de detección de enfoque. */
export type InitialDocType =
  | "Contrato de Precio Fijo (FP)"
  | "SOW detallado"
  | "Pliego Técnico Cerrado"
  | "Backlog Inicial"
  | "Visión del Producto"
  | "Contrato T&M Ágil"
  | "Contrato Marco con Sprints"
  | "Acuerdo de Negocio con Fases Mixtas"
  | "Otro";

export interface Approach {
  type: ApproachType;
  rationale: string;
  detected_from: string;
}

export interface FirstInput {
  file_name: string;
  doc_type: InitialDocType;
  received_at: string;
}

/** Nivel de autoridad del PM (Paso 2 del cuestionario del Acta). */
export type PmAuthority = "Baja" | "Media" | "Alta";

export interface Milestone {
  name: string;
  date: string;
}

/** Respuestas del cuestionario del Acta de Constitución (Project Charter). Moneda: USD. */
export interface ActaFormData {
  business_case: string;
  pm_name: string;
  pm_authority: PmAuthority | "";
  budget: string;
  deadline: string;
  milestones: Milestone[];
  sponsor_name: string;
  sponsor_role: string;
  sponsor_email: string;
}

export type Level = "Alto" | "Bajo";

/** Matriz de involucramiento: Desconocedor, Resistente, Neutral, Partidario, Líder. */
export type EngagementLevel = "Desconocedor" | "Resistente" | "Neutral" | "Partidario" | "Lider";

export interface Stakeholder {
  stakeholder_id: string;
  name: string;
  organization: string;
  role: string;
  expectation: string;
  email: string;
  power: Level | "";
  interest: Level | "";
  current_level: EngagementLevel | "";
  desired_level: EngagementLevel | "";
  action_plan: string;
}

export interface Project {
  project_id: string;
  client_name: string;
  project_name: string;
  created_at: string;
  /** null hasta recibir el primer insumo. */
  approach: Approach | null;
  first_input?: FirstInput;
  current_phase: PhaseId;
  phases: Phase[];
  acta?: ActaFormData;
  stakeholders: Stakeholder[];
  /** El PM confirmó el Registro de Interesados inicial. */
  stakeholder_register_approved: boolean;
}

/** Semáforo visual del motor de fases: Verde completo, Ámbar pendiente, Rojo bloqueante. */
export type Semaforo = "verde" | "ambar" | "rojo" | "neutro";
