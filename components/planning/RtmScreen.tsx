"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, LayoutDashboard, Lock, Pencil, Plus, Scale, Trash2 } from "lucide-react";
import { trackedItems } from "@/lib/execution";
import { coverage, isRequirementDefined, newRequirement, requirementStatus } from "@/lib/rtm";
import { useProject } from "@/lib/store";
import type { Priority, Project, Requirement } from "@/lib/types";
import { Field, inputClass } from "../acta/fields";
import { PeopleList } from "./PeopleList";
import { QuestionnaireGate } from "../QuestionnaireGate";
import { btnPrimary, btnSecondary, card } from "../ui";
import { ErrorText, Hint } from "../wizard";

export function RtmScreen() {
  return (
    <QuestionnaireGate id="matriz-trazabilidad" readOnlyView={(p) => <RtmReadOnly project={p} />}>
      {(p) => <Rtm project={p} />}
    </QuestionnaireGate>
  );
}

/** Matriz congelada: estado de cada requisito desde la EDT hasta la aceptación del cliente. */
export function RtmReadOnly({ project }: { project: Project }) {
  const items = trackedItems(project);
  return (
    <section className={card}>
      <h2 className="text-base font-semibold text-kruger-dark">Matriz de Trazabilidad (solo lectura)</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-kruger-dark/55">
            <tr>
              <th className="py-2 pr-3 font-semibold">Requisito</th>
              <th className="py-2 pr-3 font-semibold">Origen / Objetivo</th>
              <th className="py-2 pr-3 font-semibold">Paquetes → Entregable</th>
              <th className="py-2 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kruger-gray/20">
            {project.requirements.map((r) => {
              const wps = items.filter((i) => r.work_package_ids.includes(i.id));
              return (
                <tr key={r.id}>
                  <td className="py-2 pr-3 text-kruger-dark">
                    <span className="font-semibold text-kruger-orange">{r.id}</span> {r.description}
                    {r.regulatory && <span className="ml-1 text-[10px] font-semibold text-semaforo-rojo">REGULATORIO</span>}
                  </td>
                  <td className="py-2 pr-3 text-xs text-kruger-dark/65">
                    {r.source} · {r.objective}
                  </td>
                  <td className="py-2 pr-3 text-xs text-kruger-dark/80">{wps.map((w) => `${w.code} ${w.name} → ${w.deliverableName}`).join(" | ") || "—"}</td>
                  <td className="py-2 text-xs font-medium text-kruger-dark">{requirementStatus(project, r)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Rtm({ project }: { project: Project }) {
  const { saveRequirement, removeRequirement, approveRtm } = useProject();
  const [draft, setDraft] = useState<Requirement | null>(null);
  const [touched, setTouched] = useState(false);
  const items = trackedItems(project);
  const cov = coverage(project);
  const allDefined = project.requirements.every(isRequirementDefined);
  const canApprove = cov.complete && allDefined;
  const objectives = project.acta?.business_case ? [project.acta.business_case] : [];

  const toggleLink = (r: Requirement, wpId: string) =>
    saveRequirement({
      ...r,
      work_package_ids: r.work_package_ids.includes(wpId) ? r.work_package_ids.filter((x) => x !== wpId) : [...r.work_package_ids, wpId],
    });

  return (
    <div className="space-y-6">
      <PeopleList project={project} />
      <datalist id="objectives">
        {objectives.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-card">
        <p className="text-sm text-kruger-dark">
          <strong>{project.requirements.length}</strong> requisitos · <strong>{project.requirements.filter((r) => r.regulatory).length}</strong> regulatorios ·{" "}
          {project.rtm_approved ? (
            <span className="font-semibold text-semaforo-verde">RTM aprobada</span>
          ) : (
            <span className="text-kruger-dark/60">pendiente de aprobación</span>
          )}
        </p>
        {!draft && (
          <button type="button" className={btnPrimary} onClick={() => setDraft(newRequirement(project.requirements))}>
            <Plus className="h-4 w-4" /> Agregar requisito
          </button>
        )}
      </div>

      {draft && (
        <section className="space-y-4 rounded-2xl border-2 border-kruger-orange/40 bg-white p-6">
          <p className="text-sm font-semibold text-kruger-orange">{draft.id}</p>
          <Field label="Requisito (qué debe cumplir el producto o el proyecto)" htmlFor="rq-desc">
            <textarea id="rq-desc" rows={2} autoFocus className={inputClass} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Origen (interesado que lo solicita)" htmlFor="rq-src">
              <input id="rq-src" list="people" className={inputClass} value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} />
            </Field>
            <Field label="Objetivo de negocio al que contribuye" htmlFor="rq-obj" hint={objectives.length ? "Sugerido desde el Acta de Constitución." : undefined}>
              <input id="rq-obj" list="objectives" className={inputClass} value={draft.objective} onChange={(e) => setDraft({ ...draft, objective: e.target.value })} />
            </Field>
          </div>
          <fieldset>
            <legend className="text-sm font-medium text-kruger-dark">Prioridad</legend>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:max-w-sm">
              {(["Alta", "Media", "Baja"] as Priority[]).map((pr) => (
                <label key={pr} className={clsx("cursor-pointer rounded-xl border-2 py-2 text-center text-sm font-semibold", draft.priority === pr ? "border-kruger-orange bg-kruger-orange-soft text-kruger-orange" : "border-kruger-gray/30 text-kruger-dark")}>
                  <input type="radio" className="sr-only" checked={draft.priority === pr} onChange={() => setDraft({ ...draft, priority: pr })} />
                  {pr}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Criterio de aceptación (cómo lo validará el cliente)" htmlFor="rq-acc">
            <input id="rq-acc" className={inputClass} value={draft.acceptance_criterion} onChange={(e) => setDraft({ ...draft, acceptance_criterion: e.target.value })} />
          </Field>
          <label className="flex items-start gap-2 text-sm text-kruger-dark">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-kruger-orange" checked={draft.regulatory} onChange={(e) => setDraft({ ...draft, regulatory: e.target.checked })} />
            Requisito regulatorio o legal (innegociable: no se puede eliminar ni dejar sin cobertura)
          </label>
          <ErrorText show={touched && !isRequirementDefined(draft)}>Completa requisito, origen, objetivo, prioridad y criterio de aceptación.</ErrorText>
          <div className="flex gap-2">
            <button
              type="button"
              className={btnPrimary}
              onClick={() => {
                if (!isRequirementDefined(draft)) return setTouched(true);
                saveRequirement(draft);
                setDraft(null);
                setTouched(false);
              }}
            >
              Guardar requisito
            </button>
            <button type="button" className={btnSecondary} onClick={() => setDraft(null)}>
              Cancelar
            </button>
          </div>
        </section>
      )}

      {/* Hacia adelante: requisito → paquetes de trabajo */}
      <section className={card}>
        <h2 className="text-base font-semibold text-kruger-dark">Trazabilidad hacia adelante · Requisito → Paquete de trabajo</h2>
        {items.length === 0 && (
          <p className="mt-3 flex items-center gap-2 text-sm text-kruger-dark/70">
            <Lock className="h-4 w-4" /> El vínculo con la EDT se habilita al aprobar la{" "}
            <Link href="/cuestionario/linea-base-alcance" className="text-kruger-orange hover:underline">
              Línea Base del Alcance
            </Link>
            .
          </p>
        )}
        <ul className="mt-4 space-y-3">
          {project.requirements.map((r) => {
            const uncovered = cov.uncovered.some((x) => x.id === r.id);
            return (
              <li key={r.id} className={clsx("rounded-xl p-4", uncovered && items.length ? "bg-semaforo-rojo/5" : "bg-kruger-gray-soft")}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 text-sm text-kruger-dark">
                    <span className="font-semibold text-kruger-orange">{r.id}</span> {r.description}
                    {r.regulatory && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-semaforo-rojo/10 px-2 py-0.5 text-[10px] font-semibold text-semaforo-rojo">
                        <Scale className="h-3 w-3" /> Regulatorio
                      </span>
                    )}
                  </p>
                  <span className="text-xs text-kruger-dark/60">
                    {r.priority} · {r.source} · {requirementStatus(project, r)}
                  </span>
                </div>
                {items.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {items.map((it) => {
                      const on = r.work_package_ids.includes(it.id);
                      return (
                        <label key={it.id} className={clsx("cursor-pointer rounded-full border px-3 py-1 text-xs font-medium", on ? "border-kruger-orange bg-kruger-orange-soft text-kruger-orange" : "border-kruger-gray/40 bg-white text-kruger-dark")}>
                          <input type="checkbox" className="sr-only" aria-label={`${r.id} ↔ ${it.code}`} checked={on} onChange={() => toggleLink(r, it.id)} />
                          {it.code} {it.name}
                        </label>
                      );
                    })}
                  </div>
                )}
                <div className="mt-3 flex gap-3 text-xs">
                  <button type="button" className="inline-flex items-center gap-1 font-medium text-kruger-orange hover:underline" onClick={() => setDraft(r)}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  {!r.regulatory && (
                    <button type="button" className="ml-auto inline-flex items-center gap-1 font-medium text-kruger-dark/55 hover:text-semaforo-rojo" onClick={() => removeRequirement(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </button>
                  )}
                </div>
              </li>
            );
          })}
          {project.requirements.length === 0 && <li className="text-sm text-kruger-dark/60">Aún no hay requisitos registrados.</li>}
        </ul>
      </section>

      {/* Hacia atrás: paquete de trabajo → requisito → objetivo */}
      {items.length > 0 && (
        <section className={card}>
          <h2 className="text-base font-semibold text-kruger-dark">Trazabilidad hacia atrás · Paquete de trabajo → Requisito → Objetivo</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-kruger-dark/55">
                <tr>
                  <th className="py-2 pr-3 font-semibold">Paquete</th>
                  <th className="py-2 pr-3 font-semibold">Entregable</th>
                  <th className="py-2 pr-3 font-semibold">Requisitos</th>
                  <th className="py-2 font-semibold">Objetivo / Origen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kruger-gray/20">
                {items.map((it) => {
                  const reqs = project.requirements.filter((r) => r.work_package_ids.includes(it.id));
                  return (
                    <tr key={it.id} className={reqs.length ? "" : "bg-semaforo-rojo/5"}>
                      <td className="py-2 pr-3 text-kruger-dark">
                        <span className="text-kruger-orange">{it.code}</span> {it.name}
                      </td>
                      <td className="py-2 pr-3 text-kruger-dark/70">{it.deliverableName}</td>
                      <td className="py-2 pr-3 text-kruger-dark">{reqs.length ? reqs.map((r) => r.id).join(", ") : <span className="text-semaforo-rojo">Sin requisito</span>}</td>
                      <td className="py-2 text-xs text-kruger-dark/65">{reqs.map((r) => `${r.objective} · ${r.source}`).join(" | ") || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {items.length > 0 && (cov.uncovered.length > 0 || cov.untraced.length > 0) && (
        <section role="alert" className="space-y-2 rounded-2xl border border-semaforo-ambar/40 bg-white p-5 text-sm text-kruger-dark">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 text-semaforo-ambar" /> Brechas de trazabilidad
          </p>
          {cov.uncovered.length > 0 && <p>Requisitos sin paquete de trabajo (no se entregarían): {cov.uncovered.map((r) => r.id).join(", ")}.</p>}
          {cov.untraced.length > 0 && (
            <p>Paquetes sin requisito (trabajo no solicitado / gold plating): {cov.untraced.map((w) => `${w.code} ${w.name}`).join(", ")}.</p>
          )}
        </section>
      )}

      <Hint>La RTM se aprueba solo con cobertura bidireccional completa: todo requisito tiene paquete de trabajo y todo paquete responde a un requisito.</Hint>
      <div className="flex flex-col-reverse justify-between gap-3 border-t border-kruger-gray/25 pt-6 sm:flex-row sm:items-center">
        <Link href="/" className={btnSecondary}>
          <LayoutDashboard className="h-4 w-4" /> Volver al Dashboard
        </Link>
        {!project.rtm_approved && (
          <button type="button" className={btnPrimary} disabled={!canApprove} onClick={approveRtm}>
            <CheckCircle2 className="h-4 w-4" /> Aprobar Matriz de Trazabilidad
          </button>
        )}
      </div>
    </div>
  );
}
