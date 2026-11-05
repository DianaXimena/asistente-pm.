// Modelo de datos del asistente, alineado con la "Estructura de Base de Datos JSON Integrada"
// de los documentos de diseño.

export type ApproachType = "Predictivo" | "Agil" | "Hibrido";

export type PhaseId = "inicio" | "planificacion" | "ejecucion" | "control" | "cierre";

export type PhaseStatus = "Completada" | "En Progreso" | "Bloqueada" | "No Iniciada";

export type InputStatus = "Aprobado" | "Pendiente de Firma" | "En Progreso" | "No Iniciado";

/** Cuestionarios guiados por el asistente. */
export type QuestionnaireId =
  | "acta-constitucion"
  | "registro-interesados"
  | "linea-base-alcance"
  | "linea-base-cronograma"
  | "registro-riesgos"
  | "linea-base-costos"
  | "lecciones-aprendidas"
  | "asignacion-recursos"
  | "informe-desempeno"
  | "solicitud-cambio";

export interface MandatoryInput {
  artifact_name: string;
  status: InputStatus;
  /** Si el insumo se genera con un cuestionario guiado del asistente. */
  questionnaire?: QuestionnaireId;
  /** Insumos que deben estar aprobados antes de iniciar este cuestionario. */
  requires?: QuestionnaireId[];
  /** Cómo se completó: con el cuestionario o adjuntando el documento (cuestionario omitido). */
  source?: "cuestionario" | "archivo";
  file_name?: string;
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

/* ---------- Planificación (guía PMP / PMBOK) ---------- */

/** Paquete de trabajo de la EDT con su entrada en el Diccionario de la EDT. */
export interface WorkPackage {
  id: string;
  name: string;
  description: string;
  owner: string;
  acceptance: string;
}

export interface Deliverable {
  id: string;
  name: string;
  work_packages: WorkPackage[];
}

/** Línea Base del Alcance = Enunciado del Alcance + EDT + Diccionario de la EDT. */
export interface ScopeBaseline {
  product_description: string;
  acceptance_criteria: string;
  deliverables: Deliverable[];
  exclusions: string;
  assumptions: string;
  constraints: string;
}

export type ScheduleMethod = "Estimación única" | "Tres valores (PERT)";

export interface ScheduleItem {
  /** Id del paquete de trabajo (o ítem libre si la EDT se cargó como archivo). */
  id: string;
  name: string;
  /** Duración en días laborables (estimación única o resultado PERT). */
  most_likely: string;
  optimistic: string;
  pessimistic: string;
  /** Predecesora fin-a-inicio. */
  predecessor: string;
}

export interface ScheduleBaseline {
  start_date: string;
  method: ScheduleMethod;
  items: ScheduleItem[];
}

export type RiskType = "Amenaza" | "Oportunidad";

export interface Risk {
  risk_id: string;
  cause: string;
  event: string;
  effect: string;
  type: RiskType | "";
  /** Probabilidad en % (0–100). */
  probability: string;
  /** Impacto monetario en USD. */
  impact: string;
  strategy: string;
  response: string;
  owner: string;
}

export type CostMethod = "Análoga" | "Paramétrica" | "Ascendente (bottom-up)";

export interface CostItem {
  id: string;
  name: string;
  estimate: string;
}

export interface CostBaseline {
  method: CostMethod | "";
  items: CostItem[];
  /** Solo se usa si el Registro de Riesgos se cargó como archivo (sin EMV calculable). */
  manual_contingency: string;
  /** % de reserva de gestión definido por la PMO / gobernanza. */
  management_reserve_pct: string;
}

/* ---------- Ejecución ---------- */

export type KnowledgeArea =
  | "Integración"
  | "Alcance"
  | "Cronograma"
  | "Costos"
  | "Calidad"
  | "Recursos"
  | "Comunicaciones"
  | "Riesgos"
  | "Adquisiciones"
  | "Interesados";

export interface Lesson {
  id: string;
  type: "Positiva" | "Negativa" | "";
  situation: string;
  area: KnowledgeArea | "";
  impact: string;
  recommendation: string;
  recorded_by: string;
  date: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  organization: string;
  kind: "Interno" | "Externo" | "";
  /** Dedicación en % (1–100). */
  allocation: string;
}

/** Matriz RACI simplificada por paquete de trabajo. */
export interface Assignment {
  item_id: string;
  item_name: string;
  /** A: un único responsable de rendir cuentas. */
  accountable: string;
  /** R: quienes ejecutan el trabajo. */
  responsible: string[];
}

export interface ResourcePlan {
  members: TeamMember[];
  assignments: Assignment[];
  agreed_with: string;
  agreed_date: string;
}

export type WpExecStatus = "No iniciado" | "En ejecución" | "Completado";

export interface WpProgress {
  status: WpExecStatus;
  /** Controlar la Calidad: inspección interna antes de marcar como completado. */
  qc_verified_by: string;
  qc_date: string;
}

export interface PerformanceReport {
  id: string;
  /** Periodo YYYY-MM. */
  period: string;
  cutoff_date: string;
  pv: string;
  ev: string;
  ac: string;
  bac: string;
  completed_items: string[];
  blocking_issues: boolean | null;
  notes: string;
  recipients: string[];
  published_at: string;
}

export interface InterventionAttempt {
  level: 1 | 2 | 3 | 4;
  action: string;
  result: string;
  date: string;
}

export interface Impediment {
  id: string;
  description: string;
  people_blocked: string;
  critical_path: boolean;
  owner: string;
  due_date: string;
  level: 1 | 2 | 3 | 4;
  attempts: InterventionAttempt[];
  /** Revisiones de estado en las que el impedimento siguió abierto. */
  reviews: number;
  impact_amount: string;
  impact_days: string;
  status: "Abierto" | "Resuelto";
  resolution: string;
  created_at: string;
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
  scope?: ScopeBaseline;
  schedule?: ScheduleBaseline;
  risks: Risk[];
  /** El PM confirmó el Registro de Riesgos. */
  risk_register_approved?: boolean;
  costs?: CostBaseline;
  /** Fecha en que inició la fase de Ejecución. */
  execution_started_at?: string;
  lessons: Lesson[];
  resources?: ResourcePlan;
  wp_progress: Record<string, WpProgress>;
  reports: PerformanceReport[];
  impediments: Impediment[];
  /** Umbral de escalamiento a gobernanza configurado en el proyecto. */
  escalation_threshold?: { amount: string; days: string };
}

/** Semáforo visual del motor de fases: Verde completo, Ámbar pendiente, Rojo bloqueante. */
export type Semaforo = "verde" | "ambar" | "rojo" | "neutro";
