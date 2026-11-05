"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, ArrowRight, Briefcase, CalendarCheck, Compass, FileText, Gauge, History, KanbanSquare, PartyPopper, PenLine, RotateCcw } from "lucide-react";
import { APPROACH_LABEL, getAlerts, getAssistantMessage, getOverallProgress } from "@/lib/assistant";
import { useProject } from "@/lib/store";
import type { PhaseId, Project } from "@/lib/types";
import { AssistantCard } from "./AssistantCard";
import { Radiator } from "./execution/ExecutionBoard";
import { MonitoringPanel } from "./control/MonitoringPanel";
import { readinessLevel, readinessScore } from "./tools/Tools";
import { PhaseChecklist } from "./PhaseChecklist";
import { PhaseStepper } from "./PhaseStepper";
import { ProgressBar } from "./ProgressBar";
import { RequireProject } from "./RequireProject";

export function Dashboard() {
  return <RequireProject>{(p) => <DashboardView project={p} />}</RequireProject>;
}

function DashboardView({ project }: { project: Project }) {
  const { signActa, advancePhase, closeProject, reset } = useProject();
  const [selected, setSelected] = useState<PhaseId>(project.current_phase);
  useEffect(() => setSelected(project.current_phase), [project.current_phase]);

  const assistant = getAssistantMessage(project);
  const alerts = getAlerts(project);
  const overall = getOverallProgress(project);
  const selectedPhase = project.phases.find((p) => p.id === selected) ?? project.phases[0];

  return (
    <div className="min-h-screen bg-kruger-gray-soft lg:flex">
      {/* Barra lateral de progreso por fases */}
      <aside className="border-b border-kruger-gray/25 bg-white lg:sticky lg:top-0 lg:h-screen lg:w-80 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <Link href="/" className="mx-6 mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-kruger-orange hover:underline">
          <ArrowRight className="h-3.5 w-3.5 rotate-180" /> Portafolio de proyectos
        </Link>
        <div className="flex items-center gap-2 px-6 pb-4 pt-4">
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
          <p className="mt-2 text-[11px] text-kruger-dark/50">Cada fase pesa 20%.</p>
        </div>

        <nav aria-label="Fases del proyecto" className="px-4 pb-6 pt-5">
          <p className="px-2 pb-3 text-xs font-medium uppercase tracking-wide text-kruger-dark/50">Fases</p>
          <PhaseStepper phases={project.phases} currentPhase={project.current_phase} selectedPhase={selected} onSelect={setSelected} />
          <p className="px-2 pb-2 pt-6 text-xs font-medium uppercase tracking-wide text-kruger-dark/50">Herramientas</p>
          <ul className="space-y-1">
            {[
              { href: "/ejecucion", label: "Tablero de Ejecución", icon: KanbanSquare },
              { href: "/reuniones", label: "Actas de reunión", icon: CalendarCheck },
              { href: "/disposicion-cambio", label: "Disposición al cambio", icon: Gauge },
              { href: "/auditoria", label: "Bitácora de auditoría", icon: History },
            ].map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-kruger-dark transition hover:bg-kruger-gray-soft">
                  <Icon className="h-4 w-4 text-kruger-orange" /> {label}
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Se eliminará este proyecto del portafolio guardado en este navegador. ¿Continuar?")) reset();
            }}
            className="mt-4 inline-flex items-center gap-1.5 px-2 text-xs text-kruger-dark/50 transition hover:text-semaforo-rojo"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Eliminar este proyecto del portafolio
          </button>
        </nav>
      </aside>

      {/* Contenido principal */}
      <main key={project.project_id} className="flex-1 animate-enter px-4 py-6 sm:px-8 lg:py-10">
        <div className="mx-auto max-w-4xl space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-kruger-dark/55">
                {project.client_name} · {project.project_id}
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-kruger-dark sm:text-3xl">{project.project_name}</h1>
            </div>
            {project.approach ? (
              <span
                title={`${project.approach.rationale} (Detectado a partir de: ${project.approach.detected_from})`}
                className="inline-flex items-center gap-2 rounded-full border border-kruger-gray/30 bg-white px-3 py-1.5 text-xs font-medium text-kruger-dark"
              >
                <Briefcase className="h-3.5 w-3.5 text-kruger-orange" />
                Enfoque {APPROACH_LABEL[project.approach.type]}
              </span>
            ) : (
              <Link
                href="/nuevo/insumo"
                className="inline-flex items-center gap-2 rounded-full border border-dashed border-kruger-orange/60 bg-white px-3 py-1.5 text-xs font-medium text-kruger-orange"
              >
                <FileText className="h-3.5 w-3.5" /> Enfoque pendiente de detección
              </Link>
            )}
          </header>

          {alerts.map((a) => (
            <div
              key={a.id}
              data-testid="alert-card"
              className={clsx(
                "flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between",
                a.severity === "rojo" ? "border-semaforo-rojo/40" : "border-semaforo-ambar/40",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={clsx(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    a.severity === "rojo" ? "bg-semaforo-rojo/10" : "bg-semaforo-ambar/15",
                  )}
                >
                  <AlertTriangle className={clsx("h-5 w-5", a.severity === "rojo" ? "text-semaforo-rojo" : "text-semaforo-ambar")} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-kruger-dark">{a.title}</p>
                  <p className="mt-0.5 text-xs text-kruger-dark/60">{a.detail}</p>
                </div>
              </div>
              {a.action === "sign-acta" && (
                <button
                  type="button"
                  onClick={signActa}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-kruger-gray/40 px-4 py-2 text-sm font-medium text-kruger-dark transition hover:border-kruger-orange hover:text-kruger-orange"
                >
                  <PenLine className="h-4 w-4" /> Registrar firma recibida
                </button>
              )}
              {a.href && (
                <Link
                  href={a.href}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-kruger-gray/40 px-4 py-2 text-sm font-medium text-kruger-dark transition hover:border-kruger-orange hover:text-kruger-orange"
                >
                  {a.linkLabel} <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          ))}

          {project.closure?.closed_at && (
            <section className="flex items-center gap-4 rounded-2xl border border-semaforo-verde/30 bg-white p-6 shadow-card">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-kruger-orange-soft">
                <PartyPopper className="h-6 w-6 text-kruger-orange" />
              </span>
              <div>
                <p className="text-base font-semibold text-kruger-dark">¡Felicitaciones al equipo!</p>
                <p className="text-sm text-kruger-dark/65">
                  Proyecto cerrado el {new Date(project.closure.closed_at).toLocaleDateString("es-EC", { day: "2-digit", month: "long", year: "numeric" })}. Reconoce el trabajo de
                  todos y libera los recursos.
                </p>
              </div>
            </section>
          )}

          <AssistantCard data={assistant} onAdvance={advancePhase} onClose={closeProject} />

          <Link
            href="/disposicion-cambio"
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-kruger-gray/25 bg-white p-4 shadow-card transition hover:border-kruger-orange"
          >
            <span className="flex items-center gap-3 text-sm text-kruger-dark">
              <Gauge className="h-5 w-5 text-kruger-orange" />
              {project.change_readiness
                ? `Disposición al cambio de la organización: ${readinessScore(project.change_readiness)}/20 · ${readinessLevel(readinessScore(project.change_readiness))}`
                : "Evalúa la disposición al cambio de la organización (4 factores, 1 minuto)"}
            </span>
            <ArrowRight className="h-4 w-4 text-kruger-orange" />
          </Link>

          {["ejecucion", "control", "cierre"].includes(project.current_phase) && (
            <section className="rounded-2xl border border-kruger-gray/25 bg-white p-6 shadow-card">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-kruger-dark">Radiador de información</h2>
                <Link href="/ejecucion" className="inline-flex items-center gap-2 text-sm font-medium text-kruger-orange hover:underline">
                  <KanbanSquare className="h-4 w-4" /> Abrir Tablero de Ejecución
                </Link>
              </div>
              <Radiator project={project} compact />
            </section>
          )}

          {selectedPhase.id === "control" && <MonitoringPanel project={project} />}

          <PhaseChecklist project={project} phase={selectedPhase} isCurrent={selectedPhase.id === project.current_phase} />
        </div>
      </main>
    </div>
  );
}
