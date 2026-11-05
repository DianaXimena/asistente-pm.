"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { CalendarCheck, LayoutDashboard, MessageSquareQuote, Plus, Printer, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/acta";
import { approvalDateError, todayIso } from "@/lib/audit";
import { uid } from "@/lib/planning";
import { useProject } from "@/lib/store";
import type { ChangeReadiness, Meeting, MeetingTask, Project } from "@/lib/types";
import { Field, inputClass } from "../acta/fields";
import { PeopleList } from "../planning/PeopleList";
import { AddBtn, RemoveBtn } from "../planning/ScopeWizard";
import { RequireProject } from "../RequireProject";
import { btnPrimary, btnSecondary, card } from "../ui";
import { ErrorText, Hint } from "../wizard";

/* ======================= Evaluación de Disposición al Cambio ======================= */

export const READINESS_FACTORS: { key: keyof Omit<ChangeReadiness, "notes" | "assessed_at">; title: string; question: string; action: string }[] = [
  { key: "sponsorship", title: "Patrocinio activo", question: "¿El Patrocinador promueve visiblemente el cambio?", action: "Acordar con el Patrocinador mensajes y apariciones visibles que respalden el cambio." },
  { key: "capacity", title: "Capacidad de absorción", question: "¿La organización tiene capacidad para absorber el cambio junto con su operación?", action: "Escalonar la adopción y revisar otros cambios simultáneos que compitan por las mismas personas." },
  { key: "incentives", title: "Alineación de incentivos", question: "¿Los incentivos de las personas están alineados con el cambio?", action: "Revisar con las áreas qué metas o incentivos contradicen el uso del nuevo entregable." },
  { key: "understanding", title: "Comprensión del porqué", question: "¿Las personas entienden por qué se hace el cambio?", action: "Comunicar el caso de negocio y los beneficios esperados en lenguaje de cada área." },
];

export const readinessScore = (c: ChangeReadiness) => c.sponsorship + c.capacity + c.incentives + c.understanding;
/** Interpretación sobre 20 puntos (umbrales del asistente). */
export const readinessLevel = (score: number) => (score >= 16 ? "Alta" : score >= 11 ? "Media" : "Baja");

export function ChangeReadinessScreen() {
  return <RequireProject>{(p) => <Readiness project={p} />}</RequireProject>;
}

function Readiness({ project }: { project: Project }) {
  const { saveChangeReadiness } = useProject();
  const [c, setC] = useState<ChangeReadiness>(
    project.change_readiness ?? { sponsorship: 0, capacity: 0, incentives: 0, understanding: 0, notes: "", assessed_at: "" },
  );
  const [saved, setSaved] = useState(false);
  const complete = READINESS_FACTORS.every((f) => c[f.key] > 0);
  const score = readinessScore(c);
  return (
    <div className="space-y-6">
      <Hint>
        Doble vía del cambio: además de terminar a tiempo, la organización debe estar lista para usar lo que el proyecto entrega. Califica cada factor de 1 (muy bajo) a 5
        (muy alto).
      </Hint>
      {READINESS_FACTORS.map((f) => (
        <fieldset key={f.key} className={card}>
          <legend className="sr-only">{f.title}</legend>
          <p className="text-sm font-semibold text-kruger-dark">{f.title}</p>
          <p className="mt-1 text-sm text-kruger-dark/70">{f.question}</p>
          <div className="mt-3 grid grid-cols-5 gap-2 sm:max-w-md">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className={clsx("cursor-pointer rounded-xl border-2 py-2 text-center text-sm font-semibold", c[f.key] === n ? "border-kruger-orange bg-kruger-orange-soft text-kruger-orange" : "border-kruger-gray/30 text-kruger-dark")}>
                <input type="radio" className="sr-only" aria-label={`${f.title} ${n}`} checked={c[f.key] === n} onChange={() => (setC({ ...c, [f.key]: n }), setSaved(false))} />
                {n}
              </label>
            ))}
          </div>
          {c[f.key] > 0 && c[f.key] <= 2 && <p className="mt-3 text-xs text-kruger-dark/75">Acción sugerida: {f.action}</p>}
        </fieldset>
      ))}
      {complete && (
        <div className={card}>
          <p className="text-sm text-kruger-dark">
            Disposición al cambio: <strong className="text-kruger-orange">{score}/20 · {readinessLevel(score)}</strong>
          </p>
          <Field label="Notas" htmlFor="rd-notes">
            <textarea id="rd-notes" rows={2} className={inputClass} value={c.notes} onChange={(e) => setC({ ...c, notes: e.target.value })} />
          </Field>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={btnPrimary}
          disabled={!complete}
          onClick={() => {
            saveChangeReadiness({ ...c, assessed_at: new Date().toISOString() });
            setSaved(true);
          }}
        >
          {saved ? "Evaluación guardada" : "Guardar evaluación"}
        </button>
        <Link href="/" className={btnSecondary}>
          <LayoutDashboard className="h-4 w-4" /> Volver al Dashboard
        </Link>
      </div>
    </div>
  );
}

/* ======================= Actas de reunión ======================= */

export const MEETING_PROMPT =
  "¿Se acordaron decisiones, cambios o tareas? Genera un Acta de Reunión asignando responsables claros para asegurar la comunicación.";

export function MeetingsScreen() {
  return <RequireProject>{(p) => <Meetings project={p} />}</RequireProject>;
}

const blankTask = (): MeetingTask => ({ task: "", owner: "", due: "" });

function Meetings({ project }: { project: Project }) {
  const { saveMeeting, removeMeeting } = useProject();
  const [m, setM] = useState<Meeting | null>(null);
  const [stage, setStage] = useState<"basic" | "prompt" | "acta">("basic");
  const [touched, setTouched] = useState(false);
  const meetingDateError = m ? approvalDateError(m.date) : null;
  const basicOk = !!m && !!m.date && !meetingDateError && m.title.trim() && m.attendees.trim();
  const actaOk = !!m && m.decisions.trim() && m.tasks.length > 0 && m.tasks.every((t) => t.task.trim() && t.owner.trim() && t.due);

  return (
    <div className="space-y-6">
      <PeopleList project={project} />
      {!m && (
        <button
          type="button"
          className={btnPrimary}
          onClick={() => {
            setM({ id: uid("MTG"), date: new Date().toISOString().slice(0, 10), title: "", attendees: "", decisions: "", tasks: [] });
            setStage("basic");
          }}
        >
          <Plus className="h-4 w-4" /> Registrar reunión
        </button>
      )}

      {m && stage === "basic" && (
        <div className={clsx(card, "space-y-4")}>
          <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
            <Field label="Fecha" htmlFor="mt-date" error={meetingDateError ?? undefined}>
              <input id="mt-date" type="date" max={todayIso()} className={inputClass} value={m.date} onChange={(e) => setM({ ...m, date: e.target.value })} />
            </Field>
            <Field label="Reunión" htmlFor="mt-title">
              <input id="mt-title" autoFocus className={inputClass} placeholder="Tema o tipo de reunión" value={m.title} onChange={(e) => setM({ ...m, title: e.target.value })} />
            </Field>
          </div>
          <Field label="Asistentes" htmlFor="mt-att">
            <input id="mt-att" className={inputClass} value={m.attendees} onChange={(e) => setM({ ...m, attendees: e.target.value })} />
          </Field>
          <ErrorText show={touched && !basicOk}>Completa fecha, reunión y asistentes.</ErrorText>
          <div className="flex gap-2">
            <button type="button" className={btnPrimary} onClick={() => (basicOk ? (setTouched(false), setStage("prompt")) : setTouched(true))}>
              Registrar
            </button>
            <button type="button" className={btnSecondary} onClick={() => setM(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {m && stage === "prompt" && (
        <div role="dialog" aria-label="Sugerencia de Acta de Reunión" className="rounded-2xl border-2 border-kruger-orange/40 bg-white p-6 shadow-card">
          <p className="flex items-start gap-2 text-sm font-semibold text-kruger-dark">
            <MessageSquareQuote className="mt-0.5 h-5 w-5 shrink-0 text-kruger-orange" /> {MEETING_PROMPT}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} onClick={() => (setM({ ...m, tasks: m.tasks.length ? m.tasks : [blankTask()] }), setStage("acta"))}>
              Sí, generar Acta de Reunión
            </button>
            <button type="button" className={btnSecondary} onClick={() => (saveMeeting(m), setM(null))}>
              No, solo registrar la reunión
            </button>
          </div>
        </div>
      )}

      {m && stage === "acta" && (
        <div className={clsx(card, "space-y-4")}>
          <p className="text-sm font-semibold text-kruger-dark">Acta de Reunión · {m.title}</p>
          <Field label="Decisiones y cambios acordados" htmlFor="mt-dec">
            <textarea id="mt-dec" rows={3} autoFocus className={inputClass} value={m.decisions} onChange={(e) => setM({ ...m, decisions: e.target.value })} />
          </Field>
          <p className="text-sm font-medium text-kruger-dark">Tareas con responsable y fecha</p>
          <ul className="space-y-2">
            {m.tasks.map((t, i) => (
              <li key={i} className="grid gap-2 sm:grid-cols-[1fr_12rem_10rem_auto]">
                <input aria-label={`Tarea ${i + 1}`} className={inputClass} placeholder="Tarea" value={t.task} onChange={(e) => setM({ ...m, tasks: m.tasks.map((x, j) => (j === i ? { ...x, task: e.target.value } : x)) })} />
                <input aria-label={`Responsable tarea ${i + 1}`} list="people" className={inputClass} placeholder="Responsable" value={t.owner} onChange={(e) => setM({ ...m, tasks: m.tasks.map((x, j) => (j === i ? { ...x, owner: e.target.value } : x)) })} />
                <input aria-label={`Fecha tarea ${i + 1}`} type="date" className={inputClass} value={t.due} onChange={(e) => setM({ ...m, tasks: m.tasks.map((x, j) => (j === i ? { ...x, due: e.target.value } : x)) })} />
                <RemoveBtn label={`Eliminar tarea ${i + 1}`} onClick={() => setM({ ...m, tasks: m.tasks.filter((_, j) => j !== i) })} />
              </li>
            ))}
          </ul>
          <AddBtn onClick={() => setM({ ...m, tasks: [...m.tasks, blankTask()] })}>Agregar tarea</AddBtn>
          <ErrorText show={touched && !actaOk}>Registra las decisiones y al menos una tarea, cada una con responsable y fecha.</ErrorText>
          <div className="flex gap-2">
            <button type="button" className={btnPrimary} onClick={() => (actaOk ? (saveMeeting(m), setM(null), setTouched(false)) : setTouched(true))}>
              Guardar acta
            </button>
            <button type="button" className={btnSecondary} onClick={() => setStage("prompt")}>
              Atrás
            </button>
          </div>
        </div>
      )}

      <ul className="space-y-3">
        {[...project.meetings].sort((a, b) => b.date.localeCompare(a.date)).map((x) => (
          <li key={x.id} className={card}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-kruger-dark">
                  <CalendarCheck className="h-4 w-4 text-kruger-orange" /> {x.title}
                </p>
                <p className="mt-1 text-xs text-kruger-dark/60">
                  {formatDate(x.date)} · {x.attendees}
                </p>
              </div>
              <span className={clsx("rounded-full px-2 py-0.5 text-xs font-semibold", x.decisions ? "bg-semaforo-verde/10 text-semaforo-verde" : "bg-kruger-gray-soft text-kruger-dark/70")}>
                {x.decisions ? "Con acta" : "Sin acta"}
              </span>
            </div>
            {x.decisions && (
              <>
                <p className="mt-3 whitespace-pre-line text-sm text-kruger-dark">{x.decisions}</p>
                <ul className="mt-2 space-y-1 text-sm text-kruger-dark/80">
                  {x.tasks.map((t, i) => (
                    <li key={i}>
                      • {t.task} — <strong>{t.owner}</strong> · {formatDate(t.due)}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="mt-3 flex gap-3 border-t border-kruger-gray/15 pt-3 print:hidden">
              {!x.decisions && (
                <button type="button" className="text-xs font-medium text-kruger-orange hover:underline" onClick={() => (setM({ ...x, tasks: [blankTask()] }), setStage("acta"))}>
                  Generar acta
                </button>
              )}
              <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-kruger-dark/60 hover:text-kruger-orange" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5" /> Imprimir
              </button>
              <button type="button" className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-kruger-dark/55 hover:text-semaforo-rojo" onClick={() => removeMeeting(x.id)}>
                <Trash2 className="h-3.5 w-3.5" /> Eliminar
              </button>
            </div>
          </li>
        ))}
        {project.meetings.length === 0 && !m && <li className={clsx(card, "text-sm text-kruger-dark/70")}>Sin reuniones registradas.</li>}
      </ul>
      <Link href="/" className={btnSecondary}>
        <LayoutDashboard className="h-4 w-4" /> Volver al Dashboard
      </Link>
    </div>
  );
}
