"use client";

import { useState } from "react";
import { AlertTriangle, Briefcase, Compass, PenLine, RotateCcw } from "lucide-react";
import { APPROACH_LABEL, getAssistantMessage, getOverallProgress } from "@/lib/assistant";
import { useProject } from "@/lib/store";
import type { PhaseId } from "@/lib/types";
import { AssistantCard } from "./AssistantCard";
import { PhaseChecklist } from "./PhaseChecklist";
import { PhaseStepper } from "./PhaseStepper";
import { ProgressBar } from "./ProgressBar";

export function Dashboard() {
  const { project, signActa, reset } = useProject();
  const [selected, setSelected] = useState<PhaseId>(project.current_phase);
  const assistant = getAssistantMessage(project);
  const overall = getOverallProgress(project);
  const selectedPhase = project.phases.find((p) => p.id === selected) ?? project.phases[0];

  return (
    <div className="min-h-screen bg-kruger-gray-soft lg:flex">
      {/* Barra lateral de progreso por fases */}
      <aside className="border-b border-kruger-gray/25 bg-white lg:sticky lg:top-0 lg:h-screen lg:w-80 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2 px-6 pb-4 pt-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-kruger-orange text-white">
            <Compass className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-kruger-dark">Asistente PM</p>
            <p className="text-xs text-kruger-dark/55">Guía de gestión paso a paso</p>
          </div>
        </div>

        <div className="mx-6 rounded-xl bg-kruger-gray-soft p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-kruger-dark/60">Progreso global</span>
            <span className="text-lg font-semibold tabular-nums text-kruger-dark">{overall}%</span>
          </div>
          <div className="mt-2">
            <ProgressBar value={overall} label="Progreso global del proyecto" />
          </div>
        </div>

        <nav aria-label="Fases del proyecto" className="px-4 pb-6 pt-5">
          <p className="px-2 pb-3 text-xs font-medium uppercase tracking-wide text-kruger-dark/50">Fases</p>
          <PhaseStepper
            phases={project.phases}
            currentPhase={project.current_phase}
            selectedPhase={selected}
            onSelect={setSelected}
          />
          <button
            type="button"
            onClick={() => {
              reset();
              setSelected("inicio");
            }}
            className="mt-4 inline-flex items-center gap-1.5 px-2 text-xs text-kruger-dark/50 transition hover:text-kruger-orange"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reiniciar datos de demostración
          </button>
        </nav>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 px-4 py-6 sm:px-8 lg:py-10">
        <div className="mx-auto max-w-4xl space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-kruger-dark/55">{project.project_id}</p>
              <h1 className="mt-1 text-2xl font-semibold text-kruger-dark sm:text-3xl">{project.project_name}</h1>
            </div>
            <span
              title={project.approach.rationale}
              className="inline-flex items-center gap-2 rounded-full border border-kruger-gray/30 bg-white px-3 py-1.5 text-xs font-medium text-kruger-dark"
            >
              <Briefcase className="h-3.5 w-3.5 text-kruger-orange" />
              Enfoque {APPROACH_LABEL[project.approach.type]}
            </span>
          </header>

          {assistant.alert && (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-2xl border border-semaforo-ambar/40 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-semaforo-ambar/15">
                  <AlertTriangle className="h-5 w-5 text-semaforo-ambar" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-kruger-dark">{assistant.alert}</p>
                  <p className="mt-0.5 text-xs text-kruger-dark/60">
                    El Acta no es válida hasta que el Patrocinador la firme formalmente.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={signActa}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-kruger-gray/40 px-4 py-2 text-sm font-medium text-kruger-dark transition hover:border-kruger-orange hover:text-kruger-orange"
              >
                <PenLine className="h-4 w-4" /> Registrar firma recibida
              </button>
            </div>
          )}

          <AssistantCard data={assistant} />

          <PhaseChecklist phase={selectedPhase} isCurrent={selectedPhase.id === project.current_phase} />
        </div>
      </main>
    </div>
  );
}
