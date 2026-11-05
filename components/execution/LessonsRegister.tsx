"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { Check, LayoutDashboard, Pencil, Plus, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/acta";
import { approvalDateError, todayIso } from "@/lib/audit";
import { KNOWLEDGE_AREAS, isLessonComplete } from "@/lib/execution";
import { uid } from "@/lib/planning";
import { useProject } from "@/lib/store";
import type { Lesson, Project } from "@/lib/types";
import { Field, StepHeading, inputClass } from "../acta/fields";
import { PeopleList } from "../planning/PeopleList";
import { QuestionnaireGate } from "../QuestionnaireGate";
import { btnPrimary, btnSecondary, card } from "../ui";
import { ErrorText, Hint, WizardFrame } from "../wizard";

const today = () => new Date().toISOString().slice(0, 10);
export const newLesson = (partial: Partial<Lesson> = {}): Lesson => ({
  id: uid("LEC"),
  type: "",
  situation: "",
  area: "",
  impact: "",
  recommendation: "",
  recorded_by: "",
  date: today(),
  ...partial,
});

export function LessonsRegister() {
  return (
    <Suspense>
      <QuestionnaireGate id="lecciones-aprendidas">{(p) => <Register project={p} />}</QuestionnaireGate>
    </Suspense>
  );
}

function Register({ project }: { project: Project }) {
  const { saveLesson, removeLesson } = useProject();
  const [editing, setEditing] = useState<Lesson | null>(null);
  // Permite abrir el formulario con un hallazgo precargado (p. ej. desde un impedimento resuelto).
  const hallazgo = useSearchParams().get("hallazgo");
  const used = useRef(false);
  useEffect(() => {
    if (hallazgo && !used.current) {
      used.current = true;
      setEditing(newLesson({ situation: hallazgo }));
    }
  }, [hallazgo]);

  if (editing)
    return (
      <LessonForm
        project={project}
        initial={editing}
        onCancel={() => setEditing(null)}
        onSave={(l) => {
          saveLesson(l);
          setEditing(null);
        }}
      />
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-card">
        <p className="text-sm text-kruger-dark">
          <strong>{project.lessons.length}</strong> lecciones registradas · registro vivo durante todo el proyecto
        </p>
        <button type="button" className={btnPrimary} onClick={() => setEditing(newLesson())}>
          <Plus className="h-4 w-4" /> Registrar lección
        </button>
      </div>
      <Hint>Registra hallazgos en cuanto ocurran (no solo al cierre): qué funcionó, qué no y qué recomiendas repetir o evitar.</Hint>
      {project.lessons.length === 0 && <div className={clsx(card, "text-center text-sm text-kruger-dark/70")}>Aún no hay lecciones registradas.</div>}
      <ul className="space-y-3">
        {project.lessons.map((l) => (
          <li key={l.id} className="rounded-2xl border border-kruger-gray/25 bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  l.type === "Positiva" ? "bg-semaforo-verde/10 text-semaforo-verde" : "bg-semaforo-ambar/15 text-kruger-dark",
                )}
              >
                {l.type || "—"}
              </span>
              <span className="rounded-full bg-kruger-gray-soft px-2 py-0.5 text-xs text-kruger-dark/70">{l.area || "—"}</span>
              <span className="ml-auto text-xs text-kruger-dark/55">
                {formatDate(l.date)} · {l.recorded_by}
              </span>
            </div>
            <p className="mt-3 text-sm text-kruger-dark">{l.situation}</p>
            <p className="mt-2 text-sm text-kruger-dark/70">
              <strong className="text-kruger-dark">Recomendación:</strong> {l.recommendation}
            </p>
            <div className="mt-4 flex gap-2 border-t border-kruger-gray/15 pt-3">
              <button type="button" onClick={() => setEditing(l)} className="inline-flex items-center gap-1 text-xs font-medium text-kruger-orange hover:underline">
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
              <button type="button" onClick={() => removeLesson(l.id)} className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-kruger-dark/55 hover:text-semaforo-rojo">
                <Trash2 className="h-3.5 w-3.5" /> Eliminar
              </button>
            </div>
          </li>
        ))}
      </ul>
      <Link href="/proyecto" className={btnSecondary}>
        <LayoutDashboard className="h-4 w-4" /> Volver al Dashboard
      </Link>
    </div>
  );
}

function LessonForm({ project, initial, onSave, onCancel }: { project: Project; initial: Lesson; onSave: (l: Lesson) => void; onCancel: () => void }) {
  const [step, setStep] = useState(1);
  const [l, setL] = useState<Lesson>(initial);
  const [touched, setTouched] = useState(false);
  const set = <K extends keyof Lesson>(k: K, v: Lesson[K]) => setL((x) => ({ ...x, [k]: v }));
  const valid =
    step === 1
      ? !!l.type && l.situation.trim().length > 0
      : step === 2
        ? !!l.area && l.impact.trim().length > 0
        : isLessonComplete(l) && !approvalDateError(l.date, { date: project.created_at, label: "la creación del proyecto" });

  return (
    <WizardFrame
      step={step}
      total={3}
      valid={valid}
      onBack={() => (step === 1 ? onCancel() : setStep(step - 1))}
      backLabel={step === 1 ? "Cancelar" : "Atrás"}
      onNext={() => {
        if (!valid) return setTouched(true);
        setTouched(false);
        if (step === 3) onSave(l);
        else setStep(step + 1);
      }}
      nextLabel={step === 3 ? "Guardar lección" : "Siguiente"}
      nextIcon={step === 3 ? <Check className="h-4 w-4" /> : undefined}
    >
      <PeopleList project={project} />
      {step === 1 && (
        <>
          <StepHeading step={1} total={3} subtitle="Hallazgo" title="¿Qué pasó?" />
          <Toggle value={l.type} options={["Positiva", "Negativa"]} labels={["Positiva · funcionó bien", "Negativa · a mejorar"]} onChange={(v) => set("type", v as Lesson["type"])} />
          <Field label="Situación o hallazgo" htmlFor="sit">
            <textarea id="sit" rows={3} autoFocus className={inputClass} value={l.situation} onChange={(e) => set("situation", e.target.value)} />
          </Field>
          <ErrorText show={touched && !valid}>Indica el tipo y describe la situación.</ErrorText>
        </>
      )}
      {step === 2 && (
        <>
          <StepHeading step={2} total={3} subtitle="Área e impacto" title="¿En qué área de conocimiento y con qué impacto?" />
          <Field label="Área de conocimiento" htmlFor="area">
            <select id="area" className={inputClass} value={l.area} onChange={(e) => set("area", e.target.value as Lesson["area"])}>
              <option value="">Selecciona…</option>
              {KNOWLEDGE_AREAS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </Field>
          <Field label="Impacto en el proyecto" htmlFor="imp">
            <textarea id="imp" rows={2} className={inputClass} value={l.impact} onChange={(e) => set("impact", e.target.value)} />
          </Field>
          <ErrorText show={touched && !valid}>Selecciona el área y describe el impacto.</ErrorText>
        </>
      )}
      {step === 3 && (
        <>
          <StepHeading step={3} total={3} subtitle="Recomendación" title="¿Qué recomiendas para este y futuros proyectos?" />
          <Field label="Recomendación" htmlFor="rec">
            <textarea id="rec" rows={3} autoFocus className={inputClass} value={l.recommendation} onChange={(e) => set("recommendation", e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Registrado por" htmlFor="by">
              <input id="by" list="people" className={inputClass} value={l.recorded_by} onChange={(e) => set("recorded_by", e.target.value)} />
            </Field>
            <Field label="Fecha" htmlFor="date" error={approvalDateError(l.date, { date: project.created_at, label: "la creación del proyecto" }) ?? undefined}>
              <input id="date" type="date" max={todayIso()} className={inputClass} value={l.date} onChange={(e) => set("date", e.target.value)} />
            </Field>
          </div>
          <ErrorText show={touched && !valid}>Completa la recomendación y quién la registra.</ErrorText>
        </>
      )}
    </WizardFrame>
  );
}

export function Toggle({ value, options, labels, onChange }: { value: string; options: string[]; labels?: string[]; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o, i) => (
        <label
          key={o}
          className={clsx(
            "cursor-pointer rounded-xl border-2 px-4 py-2.5 text-center text-sm font-semibold transition focus-within:ring-4 focus-within:ring-kruger-orange/15",
            value === o ? "border-kruger-orange bg-kruger-orange-soft text-kruger-orange" : "border-kruger-gray/30 text-kruger-dark",
          )}
        >
          <input type="radio" className="sr-only" checked={value === o} onChange={() => onChange(o)} />
          {labels?.[i] ?? o}
        </label>
      ))}
    </div>
  );
}
