"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { calcInicioProgress } from "./acta";
import { canAdvance } from "./assistant";
import { createProject } from "./project-factory";
import { isStakeholderComplete } from "./stakeholders";
import type { ActaFormData, Approach, FirstInput, InputStatus, Phase, Project, QuestionnaireId, Stakeholder } from "./types";

// Persistencia provisional en el navegador hasta conectar una base de datos real.
const STORAGE_KEY = "asistente-pm:project:v2";
export const ACTA_DRAFT_KEY = "asistente-pm:acta-draft:v2";

function setInputStatus(p: Project, q: QuestionnaireId, status: InputStatus): Project {
  return {
    ...p,
    phases: p.phases.map((ph) => ({
      ...ph,
      mandatory_inputs: ph.mandatory_inputs.map((i) => (i.questionnaire === q ? { ...i, status } : i)),
    })),
  };
}

const approvedRatio = (ph: Phase) =>
  ph.mandatory_inputs.filter((i) => i.status === "Aprobado").length / ph.mandatory_inputs.length;

/**
 * Recalcula estados derivados después de cada acción:
 * - Estado del Registro de Interesados.
 * - % de Inicio: Campos Acta (70%) + Interesados (30%).
 * - % de Planificación: Σ insumos aprobados / 4 × 100.
 *   (Ejecución, Control y Cierre usarán sus fórmulas propias cuando se construyan.)
 */
function recompute(input: Project): Project {
  const allComplete = input.stakeholders.length > 0 && input.stakeholders.every(isStakeholderComplete);
  const approved = input.stakeholder_register_approved && allComplete;
  const registerStatus: InputStatus = approved ? "Aprobado" : input.stakeholders.length > 0 ? "En Progreso" : "No Iniciado";

  let p: Project = { ...input, stakeholder_register_approved: approved };
  p = setInputStatus(p, "registro-interesados", registerStatus);
  const inicio = calcInicioProgress(p);

  return {
    ...p,
    phases: p.phases.map((ph) => {
      if (ph.status === "Completada") return { ...ph, progress_percentage: 100 };
      if (ph.status !== "En Progreso") return ph;
      const progress = ph.id === "inicio" ? inicio : Math.round(approvedRatio(ph) * 100);
      return { ...ph, progress_percentage: progress };
    }),
  };
}

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
      if (raw) setProject(JSON.parse(raw) as Project);
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
    (data: ActaFormData) => mutate((p) => setInputStatus({ ...p, acta: data }, "acta-constitucion", "Pendiente de Firma")),
    [mutate],
  );

  const signActa = useCallback(() => mutate((p) => setInputStatus(p, "acta-constitucion", "Aprobado")), [mutate]);

  const saveStakeholder = useCallback(
    (s: Stakeholder) =>
      mutate((p) => {
        const exists = p.stakeholders.some((x) => x.stakeholder_id === s.stakeholder_id);
        return {
          ...p,
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

  const advancePhase = useCallback(
    () =>
      mutate((p) => {
        if (!canAdvance(p)) return p;
        const idx = p.phases.findIndex((x) => x.id === p.current_phase);
        const next = p.phases[idx + 1];
        if (!next) return p;
        return {
          ...p,
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
      advancePhase,
      reset,
    }),
    [project, hydrated, create, setApproach, submitActa, signActa, saveStakeholder, removeStakeholder, approveStakeholderRegister, advancePhase, reset],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProject(): ProjectStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProject debe usarse dentro de <ProjectProvider>");
  return ctx;
}
