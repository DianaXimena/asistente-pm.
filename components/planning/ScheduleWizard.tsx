"use client";

import { useState } from "react";
import clsx from "clsx";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/acta";
import { computeSchedule, isScheduleItemValid, itemDuration, uid, workPackages } from "@/lib/planning";
import { findInput, useProject } from "@/lib/store";
import { useDraft } from "@/lib/useDraft";
import type { Project, ScheduleBaseline, ScheduleItem, ScheduleMethod } from "@/lib/types";
import { Field, StepHeading, inputClass } from "../acta/fields";
import { QuestionnaireGate } from "../QuestionnaireGate";
import { ErrorText, Hint, WizardFrame } from "../wizard";
import { AddBtn, Done, RemoveBtn } from "./ScopeWizard";

const TOTAL = 4;
const METHODS: { value: ScheduleMethod; detail: string }[] = [
  { value: "Estimación única", detail: "Una duración por paquete (juicio experto, análoga o paramétrica)." },
  { value: "Tres valores (PERT)", detail: "Optimista, más probable y pesimista: (O + 4M + P) / 6." },
];

export function ScheduleWizard() {
  return <QuestionnaireGate id="linea-base-cronograma">{(p) => <Wizard project={p} />}</QuestionnaireGate>;
}

const blankItem = (id: string, name: string): ScheduleItem => ({ id, name, most_likely: "", optimistic: "", pessimistic: "", predecessor: "" });

/** Ítems del cronograma: paquetes de trabajo de la EDT (conservando lo ya estimado). */
function initialSchedule(project: Project): ScheduleBaseline {
  const base: ScheduleBaseline = project.schedule ?? { start_date: "", method: "Estimación única", items: [] };
  const wps = workPackages(project.scope);
  if (wps.length === 0) return base;
  const prev = new Map(base.items.map((i) => [i.id, i]));
  return { ...base, items: wps.map((w) => ({ ...(prev.get(w.id) ?? blankItem(w.id, "")), name: `${w.code} ${w.name}` })) };
}

function Wizard({ project }: { project: Project }) {
  const { saveSchedule } = useProject();
  const [s, setS, clearDraft] = useDraft<ScheduleBaseline>(`asistente-pm:${project.project_id}:schedule-draft`, () => initialSchedule(project));
  const [step, setStep] = useState(1);
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState(false);
  const fromWbs = findInput(project, "linea-base-alcance")?.source !== "archivo" && workPackages(project.scope).length > 0;
  const set = <K extends keyof ScheduleBaseline>(k: K, v: ScheduleBaseline[K]) => setS((x) => ({ ...x, [k]: v }));
  const setItem = (idx: number, patch: Partial<ScheduleItem>) => set("items", s.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const valid =
    step === 1
      ? !!s.start_date
      : step === 2
        ? s.items.length > 0 && s.items.every((i) => i.name.trim() && isScheduleItemValid(i, s.method))
        : true;
  const result = computeSchedule(s);
  const deadline = project.acta?.deadline;
  const exceeds = !!(deadline && result.finish && result.finish > deadline);

  if (done) return <Done title="Línea Base del Cronograma aprobada" />;

  const next = () => {
    if (!valid) return setTouched(true);
    setTouched(false);
    if (step === TOTAL) {
      saveSchedule(s);
      clearDraft();
      setDone(true);
    } else setStep(step + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <WizardFrame
      step={step}
      total={TOTAL}
      valid={valid}
      onBack={() => (step === 1 ? history.back() : setStep(step - 1))}
      onNext={next}
      backLabel={step === 1 ? "Salir" : "Atrás"}
      nextLabel={step === TOTAL ? "Aprobar Línea Base del Cronograma" : "Siguiente"}
      nextIcon={step === TOTAL ? <ShieldCheck className="h-4 w-4" /> : undefined}
    >
      {step === 1 && (
        <>
          <StepHeading step={1} total={TOTAL} subtitle="Inicio y método" title="¿Cuándo inicia el trabajo y cómo estimarás las duraciones?" />
          <Field label="Fecha de inicio del proyecto" htmlFor="start" hint="Calendario de trabajo: lunes a viernes.">
            <input id="start" type="date" autoFocus className={clsx(inputClass, "sm:max-w-xs")} value={s.start_date} onChange={(e) => set("start_date", e.target.value)} />
          </Field>
          <ErrorText show={touched && !s.start_date}>Selecciona la fecha de inicio.</ErrorText>
          <fieldset>
            <legend className="text-sm font-medium text-kruger-dark">Método de estimación de duración</legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {METHODS.map((m) => (
                <label
                  key={m.value}
                  className={clsx(
                    "cursor-pointer rounded-xl border-2 p-4 transition focus-within:ring-4 focus-within:ring-kruger-orange/15",
                    s.method === m.value ? "border-kruger-orange bg-kruger-orange-soft" : "border-kruger-gray/30",
                  )}
                >
                  <input type="radio" className="sr-only" checked={s.method === m.value} onChange={() => set("method", m.value)} />
                  <span className="block text-sm font-semibold text-kruger-dark">{m.value}</span>
                  <span className="mt-1 block text-xs text-kruger-dark/65">{m.detail}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {deadline && <Hint>Fecha límite del Acta: {formatDate(deadline)}.</Hint>}
        </>
      )}

      {step === 2 && (
        <>
          <StepHeading step={2} total={TOTAL} subtitle="Duraciones" title="¿Cuántos días laborables requiere cada paquete de trabajo?" />
          {!fromWbs && <Hint>La EDT se cargó como archivo: agrega aquí los paquetes de trabajo o actividades principales.</Hint>}
          {s.method === "Tres valores (PERT)" && <Hint>Regla: Optimista ≤ Más probable ≤ Pesimista. Duración PERT = (O + 4M + P) / 6.</Hint>}
          <ul className="space-y-3">
            {s.items.map((it, idx) => {
              const bad = touched && (!it.name.trim() || !isScheduleItemValid(it, s.method));
              return (
                <li key={it.id} className={clsx("rounded-xl p-4", bad ? "bg-semaforo-rojo/5" : "bg-kruger-gray-soft")}>
                  {fromWbs ? (
                    <p className="text-sm font-medium text-kruger-dark">{it.name}</p>
                  ) : (
                    <div className="flex gap-2">
                      <input aria-label={`Nombre ${idx + 1}`} className={inputClass} placeholder="Paquete o actividad" value={it.name} onChange={(e) => setItem(idx, { name: e.target.value })} />
                      <RemoveBtn label={`Eliminar ${idx + 1}`} onClick={() => set("items", s.items.filter((_, i) => i !== idx))} />
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    {s.method === "Tres valores (PERT)" ? (
                      <>
                        <Num label="Optimista" value={it.optimistic} onChange={(v) => setItem(idx, { optimistic: v })} />
                        <Num label="Más probable" value={it.most_likely} onChange={(v) => setItem(idx, { most_likely: v })} />
                        <Num label="Pesimista" value={it.pessimistic} onChange={(v) => setItem(idx, { pessimistic: v })} />
                        {isScheduleItemValid(it, s.method) && (
                          <span className="pb-3 text-sm text-kruger-dark">
                            = <strong>{itemDuration(it, s.method)}</strong> días
                          </span>
                        )}
                      </>
                    ) : (
                      <Num label="Duración (días)" value={it.most_likely} onChange={(v) => setItem(idx, { most_likely: v })} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {!fromWbs && <AddBtn onClick={() => set("items", [...s.items, blankItem(uid("ACT"), "")])}>Agregar paquete o actividad</AddBtn>}
          <ErrorText show={touched && !valid}>Completa una duración válida para cada ítem.</ErrorText>
        </>
      )}

      {step === 3 && (
        <>
          <StepHeading step={3} total={TOTAL} subtitle="Secuencia" title="¿Qué debe terminar antes de que inicie cada paquete?" />
          <Hint>Dependencia fin-a-inicio. Sin predecesora, el paquete inicia con el proyecto.</Hint>
          <ul className="space-y-3">
            {s.items.map((it, idx) => (
              <li key={it.id} className="grid gap-2 rounded-xl bg-kruger-gray-soft p-4 sm:grid-cols-2 sm:items-center">
                <span className="text-sm font-medium text-kruger-dark">{it.name}</span>
                <select
                  aria-label={`Predecesora de ${it.name}`}
                  className={inputClass}
                  value={it.predecessor}
                  onChange={(e) => setItem(idx, { predecessor: e.target.value })}
                >
                  <option value="">Sin predecesora</option>
                  {s.items.slice(0, idx).map((p) => (
                    <option key={p.id} value={p.id}>
                      Después de: {p.name}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </>
      )}

      {step === 4 && (
        <>
          <StepHeading step={4} total={TOTAL} subtitle="Revisión" title="Revisa fechas y ruta crítica antes de aprobar" />
          {exceeds && (
            <div className="flex gap-2 rounded-xl border border-semaforo-rojo/30 bg-semaforo-rojo/5 p-3 text-sm text-kruger-dark">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-semaforo-rojo" />
              El cronograma termina el {formatDate(result.finish!)}, después de la fecha límite del Acta ({formatDate(deadline!)}). Ajusta
              duraciones o secuencia (compresión: intensificación o ejecución rápida) o escala al Patrocinador.
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-kruger-dark/55">
                <tr>
                  <th className="py-2 pr-3 font-semibold">Paquete</th>
                  <th className="py-2 pr-3 font-semibold">Días</th>
                  <th className="py-2 pr-3 font-semibold">Inicio</th>
                  <th className="py-2 font-semibold">Fin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kruger-gray/20">
                {result.items.map((r) => (
                  <tr key={r.id} className={r.critical ? "text-kruger-dark" : "text-kruger-dark/70"}>
                    <td className="py-2 pr-3">
                      {r.name}
                      {r.critical && <span className="ml-2 rounded-full bg-kruger-orange-soft px-2 py-0.5 text-[10px] font-semibold text-kruger-orange">Ruta crítica</span>}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{r.duration}</td>
                    <td className="py-2 pr-3">{formatDate(r.start)}</td>
                    <td className="py-2">{formatDate(r.finish)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.finish && (
            <p className="text-sm text-kruger-dark">
              Fin estimado del proyecto: <strong>{formatDate(result.finish)}</strong>
            </p>
          )}
        </>
      )}
    </WizardFrame>
  );
}

function Num({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-kruger-dark/65">{label}</span>
      <input type="number" min={0} step="0.5" inputMode="decimal" className={clsx(inputClass, "mt-1 w-32")} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
