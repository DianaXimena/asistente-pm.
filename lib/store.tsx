"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { calcInicioProgress } from "./acta";
import { canAdvance } from "./assistant";
import { createProject, normalizeProject } from "./project-factory";
import { executionStats, isLessonComplete } from "./execution";
import { isRiskComplete } from "./planning";
import { isStakeholderComplete } from "./stakeholders";
import type {
  ActaFormData,
  Approach,
  CostBaseline,
  FirstInput,
  InputStatus,
  MandatoryInput,
  Phase,
  Project,
  Impediment,
  Lesson,
  PerformanceReport,
  QuestionnaireId,
  ResourcePlan,
  Risk,
  WpProgress,
  ScheduleBaseline,
  ScopeBaseline,
  Stakeholder,
} from "./types";

// Persistencia provisional en el navegador hasta conectar una base de datos real.
const STORAGE_KEY = "asistente-pm:project:v3";
export const ACTA_DRAFT_KEY = "asistente-pm:acta-draft:v2";

function patchInput(p: Project, q: QuestionnaireId, patch: Partial<MandatoryInput>): Project {
  return {
    ...p,
    phases: p.phases.map((ph) => ({
      ...ph,
      mandatory_inputs: ph.mandatory_inputs.map((i) => (i.questionnaire === q ? { ...i, ...patch } : i)),
    })),
  };
}

const setInputStatus = (p: Project, q: QuestionnaireId, status: InputStatus) => patchInput(p, q, { status });

export function findInput(p: Project, q: QuestionnaireId): MandatoryInput | undefined {
  return p.phases.flatMap((ph) => ph.mandatory_inputs).find((i) => i.questionnaire === q);
}

/** Registro con lista de ítems: Aprobado si el PM lo confirmó y todo está completo; si no, En Progreso. */
function registerStatus(p: Project, q: QuestionnaireId, count: number, allComplete: boolean, approved: boolean): InputStatus {
  if (findInput(p, q)?.source === "archivo") return "Aprobado";
  if (approved && count > 0 && allComplete) return "Aprobado";
  return count > 0 ? "En Progreso" : "No Iniciado";
}

const approvedRatio = (ph: Phase) =>
  ph.mandatory_inputs.filter((i) => i.status === "Aprobado").length / ph.mandatory_inputs.length;

/**
 * Recalcula estados derivados después de cada acción:
 * - Estado del Registro de Interesados.
 * - % de Inicio: Campos Acta (70%) + Interesados (30%).
 * - % de Planificación: Σ insumos aprobados / 4 × 100.
 * - % de Ejecución: (% paquetes en ejecución + % entregables completados) / 2.
 *   (Control y Cierre usarán sus fórmulas propias cuando se construyan.)
 */
function recompute(input: Project): Project {
  const stkComplete = input.stakeholders.every(isStakeholderComplete);
  const stkStatus = registerStatus(input, "registro-interesados", input.stakeholders.length, stkComplete, input.stakeholder_register_approved);
  const riskComplete = input.risks.every(isRiskComplete);
  const riskStatus = registerStatus(input, "registro-riesgos", input.risks.length, riskComplete, !!input.risk_register_approved);

  let p: Project = {
    ...input,
    stakeholder_register_approved: stkStatus === "Aprobado",
    risk_register_approved: riskStatus === "Aprobado",
  };
  p = setInputStatus(p, "registro-interesados", stkStatus);
  p = setInputStatus(p, "registro-riesgos", riskStatus);
  // Registros vivos de Ejecución: quedan "abiertos" (aprobados) con el primer registro.
  const lessonsOpen = p.lessons.some(isLessonComplete);
  p = setInputStatus(p, "lecciones-aprendidas", registerStatus(p, "lecciones-aprendidas", lessonsOpen ? 1 : 0, true, lessonsOpen));
  p = setInputStatus(p, "informe-desempeno", registerStatus(p, "informe-desempeno", p.reports.length, true, true));
  const inicio = calcInicioProgress(p);
  const ejecucion = executionStats(p).progress;

  return {
    ...p,
    phases: p.phases.map((ph) => {
      if (ph.status === "Completada") return { ...ph, progress_percentage: 100 };
      if (ph.status !== "En Progreso") return ph;
      const progress =
        ph.id === "inicio" ? inicio : ph.id === "ejecucion" ? ejecucion : Math.round(approvedRatio(ph) * 100);
      return { ...ph, progress_percentage: progress };
    }),
  };
}

/** Una línea base guardada con el cuestionario queda aprobada y reemplaza un archivo previo. */
const asQuestionnaire: Partial<MandatoryInput> = { source: "cuestionario", file_name: undefined, status: "Aprobado" };

interface ProjectStore {
  project: Project | null;
  hydrated: boolean;
  create: (clientName: string, projectName: string) => void;
  setApproach: (approach: Approach, firstInput: FirstInput) => void;
  submitActa: (data: ActaFormData) => void;
  signActa: () => void;
  saveStakeholder: (s: Stakeholder) => void;
  removeStakeholder: (id: string) => void;
  approveStakeholderRegister: () => void;
  /** Omite el cuestionario adjuntando el documento (obligatorio para omitir). */
  attachFile: (q: QuestionnaireId, fileName: string) => void;
  saveScope: (scope: ScopeBaseline) => void;
  saveSchedule: (schedule: ScheduleBaseline) => void;
  saveCosts: (costs: CostBaseline) => void;
  saveRisk: (r: Risk) => void;
  removeRisk: (id: string) => void;
  approveRiskRegister: () => void;
  saveLesson: (l: Lesson) => void;
  removeLesson: (id: string) => void;
  saveResources: (r: ResourcePlan) => void;
  setWpProgress: (id: string, progress: WpProgress) => void;
  publishReport: (r: PerformanceReport) => void;
  saveImpediment: (i: Impediment) => void;
  removeImpediment: (id: string) => void;
  setEscalationThreshold: (t: { amount: string; days: string }) => void;
  advancePhase: () => void;
  reset: () => void;
}

const Ctx = createContext<ProjectStore | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [project, setProject] = useState<Project | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setProject(recompute(normalizeProject(JSON.parse(raw) as Project)));
    } catch {
      /* almacenamiento no disponible */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (project) localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignorar */
    }
  }, [project, hydrated]);

  const mutate = useCallback((fn: (p: Project) => Project) => {
    setProject((p) => (p ? recompute(fn(p)) : p));
  }, []);

  const create = useCallback((client: string, name: string) => setProject(recompute(createProject(client, name))), []);

  const setApproach = useCallback(
    (approach: Approach, first_input: FirstInput) => mutate((p) => ({ ...p, approach, first_input })),
    [mutate],
  );

  const submitActa = useCallback(
    (data: ActaFormData) =>
      mutate((p) =>
        patchInput({ ...p, acta: data }, "acta-constitucion", { source: "cuestionario", file_name: undefined, status: "Pendiente de Firma" }),
      ),
    [mutate],
  );

  const signActa = useCallback(() => mutate((p) => setInputStatus(p, "acta-constitucion", "Aprobado")), [mutate]);

  const saveStakeholder = useCallback(
    (s: Stakeholder) =>
      mutate((p) => {
        const exists = p.stakeholders.some((x) => x.stakeholder_id === s.stakeholder_id);
        return {
          ...patchInput(p, "registro-interesados", { source: "cuestionario", file_name: undefined }),
          stakeholders: exists
            ? p.stakeholders.map((x) => (x.stakeholder_id === s.stakeholder_id ? s : x))
            : [...p.stakeholders, s],
        };
      }),
    [mutate],
  );

  const removeStakeholder = useCallback(
    (id: string) => mutate((p) => ({ ...p, stakeholders: p.stakeholders.filter((x) => x.stakeholder_id !== id) })),
    [mutate],
  );

  const approveStakeholderRegister = useCallback(
    () => mutate((p) => ({ ...p, stakeholder_register_approved: true })),
    [mutate],
  );

  const attachFile = useCallback(
    (q: QuestionnaireId, fileName: string) =>
      mutate((p) =>
        patchInput(p, q, {
          source: "archivo",
          file_name: fileName,
          // El Acta cargada sigue requiriendo la confirmación de firma del Patrocinador.
          status: q === "acta-constitucion" ? "Pendiente de Firma" : "Aprobado",
        }),
      ),
    [mutate],
  );

  const saveScope = useCallback(
    (scope: ScopeBaseline) => mutate((p) => patchInput({ ...p, scope }, "linea-base-alcance", asQuestionnaire)),
    [mutate],
  );
  const saveSchedule = useCallback(
    (schedule: ScheduleBaseline) => mutate((p) => patchInput({ ...p, schedule }, "linea-base-cronograma", asQuestionnaire)),
    [mutate],
  );
  const saveCosts = useCallback(
    (costs: CostBaseline) => mutate((p) => patchInput({ ...p, costs }, "linea-base-costos", asQuestionnaire)),
    [mutate],
  );

  const saveRisk = useCallback(
    (r: Risk) =>
      mutate((p) => {
        const exists = p.risks.some((x) => x.risk_id === r.risk_id);
        return {
          ...patchInput(p, "registro-riesgos", { source: "cuestionario", file_name: undefined }),
          risks: exists ? p.risks.map((x) => (x.risk_id === r.risk_id ? r : x)) : [...p.risks, r],
        };
      }),
    [mutate],
  );
  const removeRisk = useCallback(
    (id: string) => mutate((p) => ({ ...p, risks: p.risks.filter((x) => x.risk_id !== id) })),
    [mutate],
  );
  const approveRiskRegister = useCallback(() => mutate((p) => ({ ...p, risk_register_approved: true })), [mutate]);

  const upsert = <T,>(list: T[], item: T, key: (x: T) => string) =>
    list.some((x) => key(x) === key(item)) ? list.map((x) => (key(x) === key(item) ? item : x)) : [...list, item];

  const saveLesson = useCallback(
    (l: Lesson) =>
      mutate((p) => ({
        ...patchInput(p, "lecciones-aprendidas", { source: "cuestionario", file_name: undefined }),
        lessons: upsert(p.lessons, l, (x) => x.id),
      })),
    [mutate],
  );
  const removeLesson = useCallback((id: string) => mutate((p) => ({ ...p, lessons: p.lessons.filter((x) => x.id !== id) })), [mutate]);
  const saveResources = useCallback(
    (resources: ResourcePlan) => mutate((p) => patchInput({ ...p, resources }, "asignacion-recursos", asQuestionnaire)),
    [mutate],
  );
  const setWpProgress = useCallback(
    (id: string, progress: WpProgress) => mutate((p) => ({ ...p, wp_progress: { ...p.wp_progress, [id]: progress } })),
    [mutate],
  );
  const publishReport = useCallback(
    (r: PerformanceReport) =>
      mutate((p) => ({
        ...patchInput(p, "informe-desempeno", { source: "cuestionario", file_name: undefined }),
        reports: upsert(p.reports, r, (x) => x.id),
      })),
    [mutate],
  );
  const saveImpediment = useCallback(
    (i: Impediment) => mutate((p) => ({ ...p, impediments: upsert(p.impediments, i, (x) => x.id) })),
    [mutate],
  );
  const removeImpediment = useCallback(
    (id: string) => mutate((p) => ({ ...p, impediments: p.impediments.filter((x) => x.id !== id) })),
    [mutate],
  );
  const setEscalationThreshold = useCallback(
    (t: { amount: string; days: string }) => mutate((p) => ({ ...p, escalation_threshold: t })),
    [mutate],
  );

  const advancePhase = useCallback(
    () =>
      mutate((p) => {
        if (!canAdvance(p)) return p;
        const idx = p.phases.findIndex((x) => x.id === p.current_phase);
        const next = p.phases[idx + 1];
        if (!next) return p;
        return {
          ...p,
          execution_started_at: next.id === "ejecucion" ? new Date().toISOString() : p.execution_started_at,
          current_phase: next.id,
          phases: p.phases.map((ph, i) =>
            i === idx ? { ...ph, status: "Completada" } : i === idx + 1 ? { ...ph, status: "En Progreso" } : ph,
          ),
        };
      }),
    [mutate],
  );

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(ACTA_DRAFT_KEY);
    } catch {
      /* ignorar */
    }
    setProject(null);
  }, []);

  const value = useMemo(
    () => ({
      project,
      hydrated,
      create,
      setApproach,
      submitActa,
      signActa,
      saveStakeholder,
      removeStakeholder,
      approveStakeholderRegister,
      attachFile,
      saveScope,
      saveSchedule,
      saveCosts,
      saveRisk,
      removeRisk,
      approveRiskRegister,
      saveLesson,
      removeLesson,
      saveResources,
      setWpProgress,
      publishReport,
      saveImpediment,
      removeImpediment,
      setEscalationThreshold,
      advancePhase,
      reset,
    }),
    [
      project,
      hydrated,
      create,
      setApproach,
      submitActa,
      signActa,
      saveStakeholder,
      removeStakeholder,
      approveStakeholderRegister,
      attachFile,
      saveScope,
      saveSchedule,
      saveCosts,
      saveRisk,
      removeRisk,
      approveRiskRegister,
      saveLesson,
      removeLesson,
      saveResources,
      setWpProgress,
      publishReport,
      saveImpediment,
      removeImpediment,
      setEscalationThreshold,
      advancePhase,
      reset,
    ],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProject(): ProjectStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProject debe usarse dentro de <ProjectProvider>");
  return ctx;
}
