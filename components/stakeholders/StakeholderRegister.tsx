"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, LayoutDashboard, Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { engagementLabel, isStakeholderComplete, needsPriorityEngagement, newStakeholder, quadrant } from "@/lib/stakeholders";
import { useProject } from "@/lib/store";
import type { Project, Stakeholder } from "@/lib/types";
import { QuestionnaireGate } from "../QuestionnaireGate";
import { btnPrimary, btnSecondary, card } from "../ui";
import { StakeholderForm } from "./StakeholderForm";

export function StakeholderRegister() {
  return <QuestionnaireGate id="registro-interesados">{(p) => <Register project={p} />}</QuestionnaireGate>;
}

function Register({ project }: { project: Project }) {
  const { saveStakeholder, removeStakeholder, approveStakeholderRegister } = useProject();
  const [editing, setEditing] = useState<Stakeholder | null>(null);
  const list = project.stakeholders;
  const complete = list.filter(isStakeholderComplete).length;
  const canApprove = list.length > 0 && complete === list.length;

  // Sugerencias tomadas del Acta (Patrocinador y PM) si aún no están registrados.
  const names = new Set(list.map((s) => s.name.trim().toLowerCase()));
  const suggestions: { label: string; partial: Partial<Stakeholder> }[] = [];
  if (project.acta?.sponsor_name && !names.has(project.acta.sponsor_name.trim().toLowerCase()))
    suggestions.push({
      label: `${project.acta.sponsor_name} · Patrocinador`,
      partial: { name: project.acta.sponsor_name, role: project.acta.sponsor_role, email: project.acta.sponsor_email },
    });
  if (project.acta?.pm_name && !names.has(project.acta.pm_name.trim().toLowerCase()))
    suggestions.push({ label: `${project.acta.pm_name} · Director del Proyecto`, partial: { name: project.acta.pm_name, role: "Director del Proyecto" } });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-card">
        <p className="text-sm text-kruger-dark">
          <strong>{list.length}</strong> interesados · <strong>{complete}</strong> completos
          {project.stakeholder_register_approved && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-semaforo-verde/10 px-2 py-0.5 text-xs font-semibold text-semaforo-verde">
              <CheckCircle2 className="h-3.5 w-3.5" /> Registro aprobado
            </span>
          )}
        </p>
        {!editing && (
          <button type="button" className={btnPrimary} onClick={() => setEditing(newStakeholder())}>
            <Plus className="h-4 w-4" /> Agregar interesado
          </button>
        )}
      </div>

      {!editing && suggestions.length > 0 && (
        <div className="rounded-2xl border border-dashed border-kruger-orange/50 bg-kruger-orange-soft/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-kruger-orange">Sugeridos desde el Acta</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((sg) => (
              <button key={sg.label} type="button" className={btnSecondary} onClick={() => setEditing(newStakeholder(sg.partial))}>
                <UserPlus className="h-4 w-4 text-kruger-orange" /> {sg.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {editing && (
        <StakeholderForm
          key={editing.stakeholder_id}
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={(s) => {
            saveStakeholder(s);
            setEditing(null);
          }}
        />
      )}

      {list.length > 0 && <PowerInterestGrid list={list} />}

      {list.length === 0 && !editing && (
        <div className={clsx(card, "text-center")}>
          <p className="text-sm text-kruger-dark/70">Aún no hay interesados registrados. Empieza por el Patrocinador y el cliente principal.</p>
        </div>
      )}

      <ul className="grid gap-4 sm:grid-cols-2">
        {list.map((s) => {
          const q = quadrant(s.power, s.interest);
          const ok = isStakeholderComplete(s);
          return (
            <li key={s.stakeholder_id} className="rounded-2xl border border-kruger-gray/25 bg-white p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-kruger-dark">{s.name}</p>
                  <p className="truncate text-xs text-kruger-dark/60">
                    {s.role} · {s.organization || "—"}
                  </p>
                </div>
                <span
                  className={clsx(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                    ok ? "bg-semaforo-verde/10 text-semaforo-verde" : "bg-semaforo-ambar/15 text-kruger-dark",
                  )}
                >
                  {ok ? "Completo" : "Incompleto"}
                </span>
              </div>
              <dl className="mt-4 space-y-1.5 text-xs">
                <Row k="Estrategia" v={q ? q.strategy : "—"} />
                <Row k="Comunicación" v={q ? q.method : "—"} />
                <Row k="Involucramiento" v={`${engagementLabel(s.current_level)} → ${engagementLabel(s.desired_level)}`} />
              </dl>
              {needsPriorityEngagement(s) && (
                <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-kruger-dark">
                  <AlertTriangle className="h-3.5 w-3.5 text-semaforo-ambar" /> Involucramiento prioritario
                </p>
              )}
              <div className="mt-4 flex gap-2 border-t border-kruger-gray/15 pt-3">
                <button type="button" onClick={() => setEditing(s)} className="inline-flex items-center gap-1 text-xs font-medium text-kruger-orange hover:underline">
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </button>
                <button
                  type="button"
                  onClick={() => removeStakeholder(s.stakeholder_id)}
                  className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-kruger-dark/55 hover:text-semaforo-rojo"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col-reverse justify-between gap-3 border-t border-kruger-gray/25 pt-6 sm:flex-row sm:items-center">
        <Link href="/" className={btnSecondary}>
          <LayoutDashboard className="h-4 w-4" /> Volver al Dashboard
        </Link>
        {!project.stakeholder_register_approved && (
          <div className="flex flex-col items-stretch gap-1 sm:items-end">
            <button type="button" disabled={!canApprove} onClick={approveStakeholderRegister} className={btnPrimary}>
              <CheckCircle2 className="h-4 w-4" /> Aprobar Registro de Interesados
            </button>
            {!canApprove && <span className="text-xs text-kruger-dark/55">Requiere al menos un interesado y todos completos.</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-kruger-dark/55">{k}</dt>
      <dd className="text-right font-medium text-kruger-dark">{v}</dd>
    </div>
  );
}

/** Cuadrícula 2x2 de Poder vs. Interés. */
function PowerInterestGrid({ list }: { list: Stakeholder[] }) {
  const cells = [
    { power: "Alto", interest: "Bajo", title: "Mantener Satisfecho" },
    { power: "Alto", interest: "Alto", title: "Gestionar de Cerca" },
    { power: "Bajo", interest: "Bajo", title: "Monitorear" },
    { power: "Bajo", interest: "Alto", title: "Mantener Informado" },
  ] as const;
  return (
    <section className={card}>
      <h2 className="text-sm font-semibold text-kruger-dark">Matriz Poder vs. Interés</h2>
      <div className="mt-4 flex gap-3">
        <span className="flex w-5 items-center justify-center text-[10px] font-semibold uppercase tracking-widest text-kruger-dark/50 [writing-mode:vertical-rl] rotate-180">
          Poder →
        </span>
        <div className="flex-1">
          <div className="grid grid-cols-2 gap-2">
            {cells.map((c) => {
              const items = list.filter((s) => s.power === c.power && s.interest === c.interest);
              const highlight = c.power === "Alto" && c.interest === "Alto";
              return (
                <div
                  key={c.title}
                  className={clsx("min-h-[5.5rem] rounded-xl p-3", highlight ? "bg-kruger-orange-soft" : "bg-kruger-gray-soft")}
                >
                  <p className={clsx("text-xs font-semibold", highlight ? "text-kruger-orange" : "text-kruger-dark/70")}>{c.title}</p>
                  <ul className="mt-2 flex flex-wrap gap-1">
                    {items.map((s) => (
                      <li key={s.stakeholder_id} className="rounded-full bg-white px-2 py-0.5 text-xs text-kruger-dark shadow-sm">
                        {s.name}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-widest text-kruger-dark/50">Interés →</p>
        </div>
      </div>
    </section>
  );
}
