"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { AlertTriangle, ArrowRight, CheckCircle2, Compass, FolderKanban, LibraryBig, Plus, X, XCircle } from "lucide-react";
import { APPROACH_LABEL, getCurrentPhase, getOverallProgress } from "@/lib/assistant";
import { PHASE_TOOLTIPS } from "@/lib/pmp";
import { indexHealth, performanceVsBaseline, type Health } from "@/lib/portfolio";
import { useProject } from "@/lib/store";
import type { Project } from "@/lib/types";
import { Field, inputClass } from "../acta/fields";
import { ProgressBar } from "../ProgressBar";
import { Tooltip } from "../Tooltip";
import { UserMenu } from "../auth/UserMenu";
import { SyncBadge } from "../SyncBadge";
import { btnPrimary, btnSecondary } from "../ui";

/** Colores de serie validados (CVD y visión normal) sobre la superficie clara. */
export const SERIES = { pv: "#1F6FB2", ev: "#F05A22", ac: "#1A9E8F" };

export function Portfolio() {
  const { projects, hydrated, create, selectProject, localOnly, uploadLocal, discardLocal, sync, owners, me } = useProject();
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [client, setClient] = useState("");
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const valid = client.trim().length > 1 && name.trim().length > 1;
  const active = projects.filter((p) => !p.closure?.closed_at);
  const closed = projects.length - active.length;

  return (
    <div className="min-h-screen bg-kruger-gray-soft">
      <header className="border-b border-kruger-gray/25 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-kruger-orange text-white">
              <Compass className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-kruger-dark">Asistente PM</p>
              <p className="text-xs text-kruger-dark/55">Portafolio de proyectos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
          <span className="hidden md:inline-flex">
            <SyncBadge />
          </span>
          <Link href="/repositorio" className="hidden items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-kruger-dark transition hover:bg-kruger-gray-soft sm:inline-flex">
            <LibraryBig className="h-4 w-4 text-kruger-orange" /> Plantillas CMMI / PMP
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="inline-flex items-center gap-2 rounded-full bg-kruger-orange px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-kruger-orange-dark hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-kruger-orange/30"
          >
            {open ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} Nuevo Proyecto
          </button>
          <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8">
        {open && (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!valid) return setTouched(true);
              create(client, name);
              router.push("/nuevo/insumo");
            }}
            className="origin-top animate-expand rounded-2xl border border-kruger-orange/30 bg-white p-6 shadow-card"
          >
            <p className="text-sm font-semibold text-kruger-dark">Nuevo proyecto</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <Field label="Nombre del cliente" htmlFor="client" error={touched && client.trim().length < 2 ? "Ingresa el cliente." : undefined}>
                <input id="client" autoFocus className={inputClass} value={client} onChange={(e) => setClient(e.target.value)} />
              </Field>
              <Field label="Nombre del proyecto" htmlFor="project" error={touched && name.trim().length < 2 ? "Ingresa el proyecto." : undefined}>
                <input id="project" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <div className="flex gap-2">
                <button type="submit" className={btnPrimary} aria-disabled={!valid}>
                  Crear <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" className={btnSecondary} onClick={() => setOpen(false)}>
                  Cancelar
                </button>
              </div>
            </div>
            <p className="mt-3 text-xs text-kruger-dark/55">Luego cargarás el primer insumo para detectar el enfoque (Predictivo, Adaptativo o Híbrido).</p>
          </form>
        )}

        {sync.mode === "cloud" && localOnly.length > 0 && (
          <section className="flex flex-col gap-3 rounded-2xl border border-kruger-orange/40 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-kruger-dark">
              Tienes <strong>{localOnly.length}</strong> proyecto(s) guardado(s) solo en este navegador:{" "}
              <span className="text-kruger-dark/70">{localOnly.map((p) => p.project_name).join(", ")}</span>. Súbelos a la base para que queden a tu nombre y
              disponibles desde cualquier equipo.
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                className={btnPrimary}
                disabled={uploading}
                onClick={async () => {
                  setUploading(true);
                  await uploadLocal();
                  setUploading(false);
                }}
              >
                {uploading ? "Subiendo…" : "Subir a la base"}
              </button>
              <button
                type="button"
                className={btnSecondary}
                onClick={() => {
                  if (window.confirm("Se descartarán los proyectos que solo existen en este navegador. ¿Continuar?")) discardLocal();
                }}
              >
                Descartar
              </button>
            </div>
          </section>
        )}

        {/* Vista de portafolio */}
        <section className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="rounded-2xl bg-gradient-to-br from-kruger-orange to-kruger-orange-dark p-6 text-white shadow-card">
            <p className="text-sm font-medium text-white/85">Proyectos en curso</p>
            <p className="mt-2 text-5xl font-semibold tabular-nums">{hydrated ? active.length : "—"}</p>
            <p className="mt-2 text-xs text-white/80">
              {projects.length} en el portafolio · {closed} cerrado{closed === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center rounded-2xl border border-kruger-gray/25 bg-white p-6 shadow-card">
            <p className="text-sm leading-relaxed text-kruger-dark/75">
              Cada tarjeta compara el <strong className="text-kruger-dark">avance real (EV)</strong> con lo{" "}
              <strong className="text-kruger-dark">planificado (PV)</strong> según la línea base de medición del desempeño. Haz clic en un proyecto para ver
              su ciclo de vida por grupos de procesos.
            </p>
          </div>
        </section>

        {hydrated && projects.length === 0 && !open && (
          <section className="flex flex-col items-center rounded-2xl border border-dashed border-kruger-gray/50 bg-white px-6 py-14 text-center">
            <FolderKanban className="h-10 w-10 text-kruger-orange" />
            <p className="mt-3 text-base font-semibold text-kruger-dark">Aún no hay proyectos</p>
            <p className="mt-1 text-sm text-kruger-dark/60">Crea el primero con “Nuevo Proyecto”.</p>
          </section>
        )}

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, i) => (
            <li key={p.project_id} className="animate-enter" style={{ animationDelay: `${i * 50}ms` }}>
              <ProjectCard
                project={p}
                owner={me?.role === "admin" && owners[p.project_id] && owners[p.project_id] !== me.email ? owners[p.project_id] : undefined}
                href={p.approach ? "/proyecto" : "/nuevo/insumo"}
                onOpen={() => selectProject(p.project_id)}
              />
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

const HEALTH_ICON: Record<Health, { icon: typeof CheckCircle2; cls: string; label: string }> = {
  Verde: { icon: CheckCircle2, cls: "text-semaforo-verde", label: "En plan" },
  Ámbar: { icon: AlertTriangle, cls: "text-semaforo-ambar", label: "Desviación moderada" },
  Rojo: { icon: XCircle, cls: "text-semaforo-rojo", label: "Desviación severa" },
};

export function HealthBadge({ label, value }: { label: string; value: number }) {
  const h = HEALTH_ICON[indexHealth(value)];
  const Icon = h.icon;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-kruger-dark">
      <Icon className={clsx("h-3.5 w-3.5", h.cls)} aria-hidden />
      {label} {value.toFixed(2)} · {h.label}
    </span>
  );
}

function ProjectCard({ project: p, href, onOpen, owner }: { project: Project; href: string; onOpen: () => void; owner?: string }) {
  const phase = getCurrentPhase(p);
  const overall = getOverallProgress(p);
  const perf = performanceVsBaseline(p);
  const closed = !!p.closure?.closed_at;
  return (
    <Link
      href={href}
      onClick={onOpen}
      aria-label={`${p.project_name} · ${p.client_name}`}
      className="group flex h-full w-full flex-col rounded-2xl border border-kruger-gray/25 bg-white p-5 text-left shadow-card transition duration-200 hover:-translate-y-1 hover:border-kruger-orange/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-kruger-orange/25"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-kruger-dark/55">{p.client_name}</p>
          <p className="mt-0.5 truncate text-base font-semibold text-kruger-dark">{p.project_name}</p>
          {owner && <p className="mt-0.5 truncate text-[11px] text-kruger-dark/55">Dueño: {owner}</p>}
        </div>
        <span
          className={clsx(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
            p.approach ? "bg-kruger-orange-soft text-kruger-orange" : "border border-dashed border-kruger-gray/60 text-kruger-dark/60",
          )}
          title={p.approach?.rationale}
        >
          {p.approach ? APPROACH_LABEL[p.approach.type] : "Enfoque pendiente"}
        </span>
      </div>

      <Tooltip content={PHASE_TOOLTIPS[phase.id]} side="top" className="mt-4">
        <p className="flex items-center justify-between text-xs text-kruger-dark/70">
          <span>{closed ? "Proyecto cerrado" : phase.phase_name}</span>
          <span className="tabular-nums">Ciclo de vida {overall}%</span>
        </p>
        <div className="mt-1.5">
          <ProgressBar value={overall} size="sm" label={`Ciclo de vida de ${p.project_name}`} />
        </div>
      </Tooltip>

      <div className="mt-5 flex-1 rounded-xl bg-kruger-gray-soft p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-kruger-dark/55">Real vs. línea base de desempeño</p>
        {perf ? (
          <>
            <Bar label="Planificado (PV)" value={perf.planned} color={SERIES.pv} />
            <Bar label="Real (EV)" value={perf.real} color={SERIES.ev} />
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {perf.spi !== null && <HealthBadge label="SPI" value={perf.spi} />}
              {perf.cpi !== null && <HealthBadge label="CPI" value={perf.cpi} />}
            </div>
          </>
        ) : (
          <p className="mt-2 text-xs text-kruger-dark/60">Línea base de medición pendiente: se activa al aprobar el Cronograma y los Costos.</p>
        )}
      </div>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-kruger-orange opacity-80 transition group-hover:gap-2 group-hover:opacity-100">
        Ver grupos de procesos <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

/** Barra horizontal fina (≤ 24px) con extremo redondeado y valor en la punta. */
function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className="mt-2" title={`${label}: ${pct}% del BAC`}>
      <div className="flex justify-between text-[11px] text-kruger-dark/70">
        <span>{label}</span>
        <span className="tabular-nums font-medium text-kruger-dark">{pct}%</span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-white">
        <div className="h-2 rounded-r-full transition-[width] duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
