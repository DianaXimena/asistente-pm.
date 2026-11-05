"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { calcInicioProgress } from "./acta";
import { mockProject } from "./mock-project";
import type { ActaFormData, InputStatus, Project } from "./types";

// Persistencia provisional en el navegador hasta conectar una base de datos real.
const STORAGE_KEY = "asistente-pm:project:v1";

function setActaStatus(project: Project, status: InputStatus): Project {
  return {
    ...project,
    phases: project.phases.map((ph) =>
      ph.id !== "inicio"
        ? ph
        : {
            ...ph,
            mandatory_inputs: ph.mandatory_inputs.map((i) =>
              i.questionnaire === "acta-constitucion" ? { ...i, status } : i,
            ),
          },
    ),
  };
}

/** Recalcula el % de Inicio con la fórmula del documento de diseño. */
function withInicioProgress(project: Project): Project {
  const progress = calcInicioProgress(project);
  return {
    ...project,
    phases: project.phases.map((ph) => (ph.id === "inicio" ? { ...ph, progress_percentage: progress } : ph)),
  };
}

interface ProjectStore {
  project: Project;
  hydrated: boolean;
  /** Guarda el Acta generada y pasa el insumo a "Pendiente de Firma" del Sponsor. */
  submitActa: (data: ActaFormData) => void;
  /** Registra la firma del Patrocinador: el Acta pasa a "Aprobado". */
  signActa: () => void;
  reset: () => void;
}

const Ctx = createContext<ProjectStore | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [project, setProject] = useState<Project>(mockProject);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setProject(JSON.parse(raw) as Project);
    } catch {
      /* almacenamiento no disponible: se usan los datos de demostración */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch {
      /* ignorar */
    }
  }, [project, hydrated]);

  const submitActa = useCallback((data: ActaFormData) => {
    setProject((p) => withInicioProgress(setActaStatus({ ...p, acta: data }, "Pendiente de Firma")));
  }, []);

  const signActa = useCallback(() => {
    setProject((p) => setActaStatus(p, "Aprobado"));
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem("asistente-pm:acta-draft:v1");
    } catch {
      /* ignorar */
    }
    setProject(mockProject);
  }, []);

  const value = useMemo(
    () => ({ project, hydrated, submitActa, signActa, reset }),
    [project, hydrated, submitActa, signActa, reset],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProject(): ProjectStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProject debe usarse dentro de <ProjectProvider>");
  return ctx;
}
