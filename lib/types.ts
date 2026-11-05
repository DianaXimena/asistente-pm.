// Modelo de datos del asistente, alineado con la "Estructura de Base de Datos JSON Integrada"
// de los documentos de diseño.

export type ApproachType = "Predictivo" | "Agil" | "Hibrido";

export type PhaseId = "inicio" | "planificacion" | "ejecucion" | "control" | "cierre";

export type PhaseStatus = "Completada" | "En Progreso" | "Bloqueada" | "No Iniciada";

export type InputStatus = "Aprobado" | "Pendiente de Firma" | "En Progreso" | "No Iniciado";

/** Cuestionarios guiados por el asistente. */
export type QuestionnaireId =
  | "matriz-trazabilidad"
  | "acta-constitucion"
  | "registro-interesados"
  | "linea-base-alcance"
  | "linea-base-cronograma"
  | "registro-riesgos"
  | "linea-base-costos"
  | "lecciones-aprendidas"
  | "asignacion-recursos"
  | "informe-desempeno"
  | "registro-evm"
  | "registro-incidentes"
  | "solicitud-cambio"
  | "aceptacion-entregables"
  | "cierre-contratos"
  | "archivo-lecciones";

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
  /** Marca de tiempo del sistema al registrar la verificación. */
  qc_recorded_at?: string;
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

/* ---------- Control ---------- */

export type Severity = "Crítica" | "Alta" | "Media" | "Baja";

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: Severity | "";
  assigned_to: string;
  reported_date: string;
  derived_from_risk_id?: string;
  status: "Abierto" | "En resolución" | "Resuelto";
  /** ¿El plan de respuesta registrado fue suficiente para contener el impacto? */
  plan_sufficient: boolean | null;
  executed_action: string;
  contingency_used: string;
  baseline_impacted: boolean;
  change_request_id?: string;
  resolution: string;
}

export type ChangeType = "Acción Preventiva" | "Acción Correctiva" | "Reparación de Defectos" | "Actualización";
export type BaselineId = "linea-base-alcance" | "linea-base-cronograma" | "linea-base-costos";

export interface ChangeImpact {
  scope: string;
  schedule_days: string;
  critical_path: boolean | null;
  cost_amount: string;
  quality: string;
  resources: string;
  risks: string;
  benefits: string;
}

export type ChangeStatus =
  | "En análisis"
  | "Resuelto sin cambio de línea base"
  | "Pendiente de decisión"
  | "Aprobada"
  | "Rechazada"
  | "Diferida";

export interface ChangeRequest {
  id: string;
  what: string;
  requester: string;
  type: ChangeType | "";
  origin: "Escrito" | "Verbal" | "";
  written_file: string;
  /** Cumplimiento regulatorio: no se negocia ni se rechaza. */
  regulatory: boolean;
  impact: ChangeImpact;
  consulted: string;
  conversation: string;
  alternative_found: boolean | null;
  alternative_detail: string;
  alternative_justification: string;
  baselines_affected: BaselineId[];
  route: "PM" | "CCB" | "";
  decision: "Aprobada" | "Rechazada" | "Diferida" | "";
  decision_by: string;
  decision_date: string;
  decision_notes: string;
  communicated: boolean;
  status: ChangeStatus;
  derived_from_incident_id?: string;
  created_at: string;
  /** Desviación de costo (% del BAC) y banda de gobernanza calculadas al decidir. */
  governance?: { cost_deviation_pct: number; band: GovernanceBand; escalation_mandatory: boolean };
  /** Marca de tiempo del sistema al registrar la decisión. */
  decided_at?: string;
  /** Sobre tolerancia: el PM informó al Patrocinador. */
  sponsor_informed?: boolean;
}

/* ---------- Cierre ---------- */

export interface DeliverableAcceptance {
  accepted_by: string;
  acceptance_date: string;
  acceptance_file: string;
  ops_owner: string;
  maintenance_plan: string;
  benefit_metrics: string;
  /** Requisitos de la RTM cuyo criterio de aceptación validó el cliente. */
  rtm_ids?: string[];
  /** Marca de tiempo del sistema al registrar la aceptación. */
  recorded_at?: string;
}

export interface Contract {
  id: string;
  name: string;
  supplier: string;
  deliverables_ok: boolean;
  final_payment: boolean;
  audit_done: boolean;
  open_claims: boolean | null;
  closure_file: string;
}

export interface Closure {
  acceptance: Record<string, DeliverableAcceptance>;
  contracts: Contract[];
  contracts_confirmed: boolean;
  final_cost: string;
  docs_archived: boolean;
  resources_released: boolean;
  lesson_tags: Record<string, string>;
  knowledge: Record<string, KnowledgeRecord>;
  opa_folder: string;
  retrospective_date: string;
  retrospective_participants: string;
  lessons_archived: boolean;
  closed_at?: string;
}

/* ---------- Auditoría (hallazgos 1, 2, 3 y 6) ---------- */

export type Priority = "Alta" | "Media" | "Baja";

/** Requisito de la Matriz de Trazabilidad de Requisitos (RTM). */
export interface Requirement {
  /** Identificador estable RTM-REQ-### */
  id: string;
  description: string;
  /** Interesado que origina el requisito (trazabilidad hacia atrás). */
  source: string;
  /** Objetivo de negocio del Acta al que contribuye. */
  objective: string;
  priority: Priority | "";
  acceptance_criterion: string;
  /** Requisito regulatorio o legal: innegociable. */
  regulatory: boolean;
  /** Paquetes de trabajo que lo satisfacen (trazabilidad hacia adelante). */
  work_package_ids: string[];
  created_at: string;
}

/** Entrada de la bitácora de auditoría: solo se agrega, nunca se edita ni se borra. */
export interface AuditEntry {
  seq: number;
  /** Marca de tiempo del sistema (no editable por el usuario). */
  at: string;
  action: string;
  entity: string;
  entity_id: string;
  detail: string;
  /** Huella encadenada con la entrada anterior para detectar alteraciones. */
  hash: string;
}

export interface GovernanceThresholds {
  /** Desviación de costo que el PM gestiona operativamente (sin escalar). */
  cost_tolerance_percentage: number;
  /** Desviación de costo a partir de la cual el escalamiento es obligatorio. */
  cost_escalation_threshold_percentage: number;
}

export type GovernanceBand = "Dentro de tolerancia" | "Sobre tolerancia" | "Sobre umbral de escalamiento";

export type KnowledgeType = "Explícito" | "Tácito";

/** Clasificación de cada lección al archivarla. */
export interface KnowledgeRecord {
  type: KnowledgeType | "";
  /** Tácito: quién posee el conocimiento. */
  holder: string;
  /** Tácito: quién lo recibe. */
  receiver: string;
  method: string;
  date: string;
}

/* ---------- Transversales ---------- */

export interface ChangeReadiness {
  sponsorship: number;
  capacity: number;
  incentives: number;
  understanding: number;
  notes: string;
  assessed_at: string;
}

export interface MeetingTask {
  task: string;
  owner: string;
  due: string;
}

export interface Meeting {
  id: string;
  date: string;
  title: string;
  attendees: string;
  decisions: string;
  tasks: MeetingTask[];
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
  incidents: Incident[];
  incident_register_reviewed?: boolean;
  change_requests: ChangeRequest[];
  change_log_reviewed?: boolean;
  /** Autoridad delegada del PM para decidir cambios sin CCB (costo en USD y días). */
  pm_authority_limit?: { amount: string; days: string };
  /** Replanificación por cambio aprobado que modifica líneas base. */
  replanning?: { cr_id: string; resume_phase: PhaseId; baselines: BaselineId[] };
  closure?: Closure;
  change_readiness?: ChangeReadiness;
  meetings: Meeting[];
  requirements: Requirement[];
  rtm_approved?: boolean;
  audit_log: AuditEntry[];
  governance_thresholds: GovernanceThresholds;
  /** BAC de referencia si la Línea Base de Costos se cargó como archivo. */
  bac_reference?: string;
  /** Documentos generados en Google Drive desde el Repositorio de Plantillas. */
  drive_docs: Record<string, DriveDoc>;
}

export interface DriveDoc {
  id: string;
  url: string;
  folder: string;
  generated_at: string;
}

/** Semáforo visual del motor de fases: Verde completo, Ámbar pendiente, Rojo bloqueante. */
export type Semaforo = "verde" | "ambar" | "rojo" | "neutro";
