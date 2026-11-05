"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, ArrowUpCircle, BookOpen, CheckCircle2, ClipboardCheck, Lock, Plus, RefreshCw, ShieldAlert } from "lucide-react";
import { formatDate } from "@/lib/acta";
import {
  LEVELS,
  RECURRENCE_MESSAGE,
  canEscalate,
  executionStats,
  isOverdue,
  isRecurring,
  latestReport,
  evm,
  progressOf,
  requiredReportPeriod,
  trackedItems,
} from "@/lib/execution";
import { uid } from "@/lib/planning";
import { useProject } from "@/lib/store";
import type { Impediment, Project, WpExecStatus } from "@/lib/types";
import { Field, inputClass } from "../acta/fields";
import { PeopleList } from "../planning/PeopleList";
import { RequireProject } from "../RequireProject";
import { btnPrimary, btnSecondary, card } from "../ui";
import { ErrorText } from "../wizard";

export function ExecutionBoard() {
  return <RequireProject>{(p) => <Board project={p} />}</RequireProject>;
}

function Board({ project }: { project: Project }) {
  const started = ["ejecucion", "control", "cierre"].includes(project.current_phase) || !!project.replanning;
  if (!started)
    return (
      <div className={clsx(card, "flex items-start gap-3")}>
        <Lock className="mt-0.5 h-5 w-5 text-kruger-dark/60" />
        <p className="text-sm text-kruger-dark/75">El tablero se habilita al aprobar el Plan y entrar a la fase de Ejecución.</p>
      </div>
    );
  return (
    <div className="space-y-8">
      <PeopleList project={project} />
      <Radiator project={project} />
      <WorkPackages project={project} />
      <Impediments project={project} />
    </div>
  );
}

export function Radiator({ project, compact }: { project: Project; compact?: boolean }) {
  const s = executionStats(project);
  const open = project.impediments.filter((i) => i.status === "Abierto").length;
  const last = latestReport(project);
  const h = last ? evm(last) : null;
  const tiles = [
    { k: "Paquetes en ejecución", v: `${s.started - s.completed}`, sub: `${s.started} de ${s.total} iniciados` },
    { k: "Paquetes completados", v: `${s.completed}`, sub: `de ${s.total}` },
    { k: "Entregables completados", v: `${s.deliverablesCompleted}`, sub: `de ${s.deliverables}` },
    { k: "Lecciones registradas", v: `${project.lessons.length}`, sub: "registro vivo" },
    { k: "Impedimentos abiertos", v: `${open}`, sub: open ? "ver tablero" : "sin bloqueos" },
    { k: "Último CPI / SPI", v: h ? `${h.cpi} / ${h.spi}` : "—", sub: h ? `${h.color}` : "sin informe" },
  ];
  return (
    <section className={compact ? "" : card}>
      {!compact && <h2 className="mb-4 text-base font-semibold text-kruger-dark">Radiador de información</h2>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.k} className="rounded-xl bg-kruger-gray-soft p-4">
            <p className="text-xs text-kruger-dark/60">{t.k}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-kruger-dark">{t.v}</p>
            <p className="text-xs text-kruger-dark/55">{t.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const STATUSES: WpExecStatus[] = ["No iniciado", "En ejecución", "Completado"];

function WorkPackages({ project }: { project: Project }) {
  const { setWpProgress } = useProject();
  const items = trackedItems(project);
  const missing = requiredReportPeriod(project);
  const blocked = !!missing || !!project.replanning;
  const [qc, setQc] = useState<{ id: string; by: string; date: string } | null>(null);

  return (
    <section className={card}>
      <h2 className="text-base font-semibold text-kruger-dark">Paquetes de trabajo</h2>
      <p className="mt-1 text-sm text-kruger-dark/60">Para marcar un paquete como completado se requiere la verificación de Control de Calidad (inspección interna).</p>
      {missing && (
        <div role="alert" className="mt-4 flex flex-col gap-3 rounded-xl border border-semaforo-rojo/30 bg-semaforo-rojo/5 p-4 text-sm text-kruger-dark sm:flex-row sm:items-center sm:justify-between">
          <span className="flex gap-2">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-semaforo-rojo" />
            Cierre de mes: genera el Informe de Desempeño de {missing}. Los cambios de estado de las tareas están bloqueados hasta cargar EV, PV y AC.
          </span>
          <Link href="/cuestionario/informe-desempeno" className={btnPrimary}>
            Generar informe
          </Link>
        </div>
      )}
      {project.replanning && (
        <div role="alert" className="mt-4 flex gap-2 rounded-xl border border-semaforo-rojo/30 bg-semaforo-rojo/5 p-4 text-sm text-kruger-dark">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-semaforo-rojo" />
          Replanificación en curso: la ejecución de tareas está bloqueada hasta aprobar de nuevo las líneas base modificadas.
        </div>
      )}
      {items.length === 0 && <p className="mt-4 text-sm text-kruger-dark/60">No hay paquetes de trabajo registrados en el asistente.</p>}
      <ul className="mt-4 divide-y divide-kruger-gray/20">
        {items.map((it) => {
          const pr = progressOf(project, it.id);
          return (
            <li key={it.id} className="py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-kruger-dark">
                    <span className="text-kruger-orange">{it.code}</span> {it.name}
                  </p>
                  <p className="text-xs text-kruger-dark/55">
                    {it.deliverableName}
                    {pr.status === "Completado" && pr.qc_verified_by && ` · Verificado (QC) por ${pr.qc_verified_by} el ${formatDate(pr.qc_date)}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1" role="group" aria-label={`Estado de ${it.name}`}>
                  {STATUSES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={blocked}
                      aria-pressed={pr.status === st}
                      onClick={() =>
                        st === "Completado"
                          ? setQc({ id: it.id, by: "", date: new Date().toISOString().slice(0, 10) })
                          : setWpProgress(it.id, { status: st, qc_verified_by: "", qc_date: "" })
                      }
                      className={clsx(
                        "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
                        pr.status === st
                          ? st === "Completado"
                            ? "border-semaforo-verde bg-semaforo-verde text-white"
                            : st === "En ejecución"
                              ? "border-kruger-orange bg-kruger-orange text-white"
                              : "border-kruger-dark/30 bg-kruger-gray-soft text-kruger-dark"
                          : "border-kruger-gray/40 bg-white text-kruger-dark/70 hover:border-kruger-orange",
                      )}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
              {qc?.id === it.id && (
                <div className="mt-3 rounded-xl bg-kruger-gray-soft p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-kruger-dark">
                    <ClipboardCheck className="h-4 w-4 text-kruger-orange" /> Controlar la Calidad: ¿cumple las especificaciones técnicas?
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
                    <Field label="Verificado por" htmlFor={`qc-${it.id}`}>
                      <input id={`qc-${it.id}`} list="people" className={inputClass} value={qc.by} onChange={(e) => setQc({ ...qc, by: e.target.value })} />
                    </Field>
                    <Field label="Fecha" htmlFor={`qcd-${it.id}`}>
                      <input id={`qcd-${it.id}`} type="date" className={inputClass} value={qc.date} onChange={(e) => setQc({ ...qc, date: e.target.value })} />
                    </Field>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={btnPrimary}
                        disabled={!qc.by.trim() || !qc.date}
                        onClick={() => {
                          setWpProgress(it.id, { status: "Completado", qc_verified_by: qc.by.trim(), qc_date: qc.date });
                          setQc(null);
                        }}
                      >
                        Verificado
                      </button>
                      <button type="button" className={btnSecondary} onClick={() => setQc(null)}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const newImpediment = (): Impediment => ({
  id: uid("IMP"),
  description: "",
  people_blocked: "",
  critical_path: false,
  owner: "",
  due_date: "",
  level: 1,
  attempts: [],
  reviews: 0,
  impact_amount: "",
  impact_days: "",
  status: "Abierto",
  resolution: "",
  created_at: new Date().toISOString(),
});

function Impediments({ project }: { project: Project }) {
  const { saveImpediment, setEscalationThreshold } = useProject();
  const [draft, setDraft] = useState<Impediment | null>(null);
  const [touched, setTouched] = useState(false);
  const [threshold, setThreshold] = useState(project.escalation_threshold ?? { amount: "", days: "" });
  const list = [...project.impediments].sort((a, b) => (a.status === b.status ? 0 : a.status === "Abierto" ? -1 : 1));
  const draftValid = !!draft && draft.description.trim() && draft.owner.trim() && draft.due_date;

  return (
    <section className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-kruger-dark">Tablero de impedimentos</h2>
          <p className="mt-1 text-sm text-kruger-dark/60">Escala de intervención: el equipo → el PM → otros interesados → gobernanza.</p>
        </div>
        {!draft && (
          <button type="button" className={btnPrimary} onClick={() => setDraft(newImpediment())}>
            <Plus className="h-4 w-4" /> Reportar impedimento
          </button>
        )}
      </div>

      <details className="mt-4 rounded-xl bg-kruger-gray-soft p-4">
        <summary className="cursor-pointer text-sm font-medium text-kruger-dark">Umbral de escalamiento del proyecto</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Impacto mayor a (USD)" htmlFor="thr-amount">
            <input id="thr-amount" type="number" min={0} className={inputClass} value={threshold.amount} onChange={(e) => setThreshold({ ...threshold, amount: e.target.value })} />
          </Field>
          <Field label="Retraso mayor a (días)" htmlFor="thr-days">
            <input id="thr-days" type="number" min={0} className={inputClass} value={threshold.days} onChange={(e) => setThreshold({ ...threshold, days: e.target.value })} />
          </Field>
          <button type="button" className={btnSecondary} onClick={() => setEscalationThreshold(threshold)}>
            Guardar umbral
          </button>
        </div>
      </details>

      {draft && (
        <div className="mt-4 space-y-4 rounded-2xl border-2 border-kruger-orange/40 p-5">
          <Field label="¿Qué está bloqueando al equipo?" htmlFor="imp-desc">
            <textarea id="imp-desc" rows={2} autoFocus className={inputClass} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="¿A cuántas personas frena?" htmlFor="imp-people">
              <input id="imp-people" type="number" min={0} className={inputClass} value={draft.people_blocked} onChange={(e) => setDraft({ ...draft, people_blocked: e.target.value })} />
            </Field>
            <label className="flex items-center gap-2 self-end pb-3 text-sm text-kruger-dark">
              <input type="checkbox" className="h-4 w-4 accent-kruger-orange" checked={draft.critical_path} onChange={(e) => setDraft({ ...draft, critical_path: e.target.checked })} />
              Afecta la ruta crítica
            </label>
            <Field label="Dueño asignado (obligatorio)" htmlFor="imp-owner">
              <input id="imp-owner" list="people" className={inputClass} value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} />
            </Field>
            <Field label="Fecha límite de resolución (obligatoria)" htmlFor="imp-due">
              <input id="imp-due" type="date" className={inputClass} value={draft.due_date} onChange={(e) => setDraft({ ...draft, due_date: e.target.value })} />
            </Field>
            <Field label="Impacto estimado (USD, opcional)" htmlFor="imp-amount">
              <input id="imp-amount" type="number" min={0} className={inputClass} value={draft.impact_amount} onChange={(e) => setDraft({ ...draft, impact_amount: e.target.value })} />
            </Field>
            <Field label="Retraso estimado (días, opcional)" htmlFor="imp-days">
              <input id="imp-days" type="number" min={0} className={inputClass} value={draft.impact_days} onChange={(e) => setDraft({ ...draft, impact_days: e.target.value })} />
            </Field>
          </div>
          <ErrorText show={touched && !draftValid}>Un impedimento no puede ser una nota suelta: requiere descripción, dueño y fecha límite.</ErrorText>
          <div className="flex gap-2">
            <button
              type="button"
              className={btnPrimary}
              onClick={() => {
                if (!draftValid) return setTouched(true);
                saveImpediment(draft!);
                setDraft(null);
                setTouched(false);
              }}
            >
              Registrar en el tablero
            </button>
            <button type="button" className={btnSecondary} onClick={() => setDraft(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <ul className="mt-4 space-y-3">
        {list.map((i) => (
          <ImpedimentCard key={i.id} project={project} imp={i} />
        ))}
        {list.length === 0 && !draft && <li className="text-sm text-kruger-dark/60">Sin impedimentos registrados.</li>}
      </ul>
    </section>
  );
}

function ImpedimentCard({ project, imp }: { project: Project; imp: Impediment }) {
  const { saveImpediment } = useProject();
  const [attempt, setAttempt] = useState({ action: "", result: "" });
  const [resolution, setResolution] = useState("");
  const lvl = LEVELS[imp.level - 1];
  const esc = canEscalate(imp, project);
  const closed = imp.status === "Resuelto";

  return (
    <li className={clsx("rounded-2xl border p-5", closed ? "border-kruger-gray/25 bg-kruger-gray-soft/60" : "border-kruger-gray/25 bg-white")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-sm font-medium text-kruger-dark">{imp.description}</p>
        <span className={clsx("rounded-full px-2 py-0.5 text-xs font-semibold", closed ? "bg-semaforo-verde/10 text-semaforo-verde" : "bg-semaforo-ambar/15 text-kruger-dark")}>
          {closed ? "Resuelto" : `Nivel ${imp.level}`}
        </span>
      </div>
      <p className="mt-1 text-xs text-kruger-dark/60">
        Dueño: {imp.owner} · Límite: <span className={clsx(isOverdue(imp) && "font-semibold text-semaforo-rojo")}>{formatDate(imp.due_date)}</span>
        {imp.people_blocked && ` · Frena a ${imp.people_blocked} persona(s)`}
        {imp.critical_path && " · Ruta crítica"} · Revisiones abiertas: {imp.reviews}
      </p>

      {isRecurring(imp) && (
        <p className="mt-3 flex gap-2 rounded-xl border border-semaforo-ambar/40 bg-semaforo-ambar/10 p-3 text-xs text-kruger-dark">
          <AlertTriangle className="h-4 w-4 shrink-0 text-semaforo-ambar" /> {RECURRENCE_MESSAGE}
        </p>
      )}

      {imp.attempts.length > 0 && (
        <ul className="mt-3 space-y-1 border-l-2 border-kruger-orange/30 pl-3 text-xs text-kruger-dark/75">
          {imp.attempts.map((a, k) => (
            <li key={k}>
              Nivel {a.level}: {a.action} → {a.result}
            </li>
          ))}
        </ul>
      )}

      {closed ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-kruger-dark">
          <span>Resolución: {imp.resolution}</span>
          <Link
            href={`/cuestionario/lecciones-aprendidas?hallazgo=${encodeURIComponent(`Impedimento: ${imp.description}. Resolución: ${imp.resolution}`)}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-kruger-orange hover:underline"
          >
            <BookOpen className="h-3.5 w-3.5" /> Registrar lección aprendida
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3 rounded-xl bg-kruger-gray-soft p-4">
          <p className="text-sm text-kruger-dark">
            <strong>Nivel {lvl.level}:</strong> {lvl.question} <span className="text-kruger-dark/65">→ {lvl.action}</span>
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input aria-label="Acción realizada" className={inputClass} placeholder="Acción realizada en este nivel" value={attempt.action} onChange={(e) => setAttempt({ ...attempt, action: e.target.value })} />
            <input aria-label="Resultado" className={inputClass} placeholder="Resultado" value={attempt.result} onChange={(e) => setAttempt({ ...attempt, result: e.target.value })} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnSecondary}
              disabled={!attempt.action.trim() || !attempt.result.trim()}
              onClick={() => {
                saveImpediment({ ...imp, attempts: [...imp.attempts, { level: imp.level, ...attempt, date: new Date().toISOString() }] });
                setAttempt({ action: "", result: "" });
              }}
            >
              Registrar intento
            </button>
            {imp.level < 3 && (
              <button type="button" className={btnSecondary} onClick={() => saveImpediment({ ...imp, level: (imp.level + 1) as Impediment["level"] })}>
                <ArrowUpCircle className="h-4 w-4" /> Subir al nivel {imp.level + 1}
              </button>
            )}
            {imp.level < 4 && (imp.level === 3 || esc.allowed) && (
              <button
                type="button"
                className={btnPrimary}
                disabled={!esc.allowed}
                title={esc.reason}
                onClick={() => saveImpediment({ ...imp, level: 4 })}
              >
                <ShieldAlert className="h-4 w-4" /> Escalar a Gobernanza / Patrocinador
              </button>
            )}
            <button type="button" className={btnSecondary} onClick={() => saveImpediment({ ...imp, reviews: imp.reviews + 1 })}>
              <RefreshCw className="h-4 w-4" /> Revisión: sigue abierto
            </button>
          </div>
          {imp.level === 3 && !esc.allowed && <p className="text-xs text-kruger-dark/60">{esc.reason}</p>}
          <div className="flex flex-col gap-2 border-t border-kruger-gray/30 pt-3 sm:flex-row">
            <input aria-label="Resolución" className={inputClass} placeholder="¿Cómo se resolvió?" value={resolution} onChange={(e) => setResolution(e.target.value)} />
            <button
              type="button"
              className={btnPrimary}
              disabled={!resolution.trim()}
              onClick={() => saveImpediment({ ...imp, status: "Resuelto", resolution: resolution.trim() })}
            >
              <CheckCircle2 className="h-4 w-4" /> Marcar resuelto
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
