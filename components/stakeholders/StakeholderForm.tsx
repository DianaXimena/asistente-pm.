"use client";

import { useState } from "react";
import clsx from "clsx";
import { AlertTriangle, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { ENGAGEMENT_LEVELS, hasEngagementGap, isIdentified, isValidOptionalEmail, needsPriorityEngagement, quadrant } from "@/lib/stakeholders";
import type { EngagementLevel, Level, Stakeholder } from "@/lib/types";
import { Field, StepDots, StepHeading, inputClass } from "../acta/fields";
import { btnGhost, btnPrimary } from "../ui";

const TOTAL = 3;

/** Flujo de 3 niveles por interesado: Identificación → Poder/Interés → Involucramiento. */
export function StakeholderForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Stakeholder;
  onSave: (s: Stakeholder) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(1);
  const [s, setS] = useState<Stakeholder>(initial);
  const [touched, setTouched] = useState(false);
  const set = <K extends keyof Stakeholder>(k: K, v: Stakeholder[K]) => setS((x) => ({ ...x, [k]: v }));

  const gap = hasEngagementGap(s);
  const valid =
    step === 1
      ? isIdentified(s) && isValidOptionalEmail(s.email)
      : step === 2
        ? !!s.power && !!s.interest
        : !!s.current_level && !!s.desired_level && (!gap || s.action_plan.trim().length > 0);
  const q = quadrant(s.power, s.interest);

  const next = () => {
    if (!valid) return setTouched(true);
    setTouched(false);
    if (step === TOTAL) onSave(s);
    else setStep(step + 1);
  };

  const err = (cond: boolean, msg: string) => (touched && cond ? msg : undefined);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        next();
      }}
      className="rounded-2xl border-2 border-kruger-orange/40 bg-white p-6 shadow-card"
    >
      <StepDots current={step} total={TOTAL} />
      <div className="mt-6 space-y-5">
        {step === 1 && (
          <>
            <StepHeading step={1} total={TOTAL} subtitle="Identificación" title="¿Quién es el interesado y qué espera del proyecto?" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre" htmlFor="stk_name" error={err(!s.name.trim(), "Ingresa el nombre.")}>
                <input id="stk_name" autoFocus className={inputClass} value={s.name} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="Organización" htmlFor="stk_org" error={err(!s.organization.trim(), "Ingresa la organización.")}>
                <input id="stk_org" className={inputClass} value={s.organization} onChange={(e) => set("organization", e.target.value)} />
              </Field>
              <Field label="Rol" htmlFor="stk_role" error={err(!s.role.trim(), "Ingresa el rol.")}>
                <input id="stk_role" className={inputClass} value={s.role} onChange={(e) => set("role", e.target.value)} />
              </Field>
              <Field
                label="Correo (opcional)"
                htmlFor="stk_email"
                hint="Necesario para enviarle informes por Push."
                error={err(!isValidOptionalEmail(s.email), "Correo no válido.")}
              >
                <input id="stk_email" type="email" className={inputClass} value={s.email} onChange={(e) => set("email", e.target.value)} />
              </Field>
            </div>
            <Field label="Expectativa principal" htmlFor="stk_exp" error={err(!s.expectation.trim(), "Describe su expectativa principal.")}>
              <textarea id="stk_exp" rows={2} className={inputClass} value={s.expectation} onChange={(e) => set("expectation", e.target.value)} />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <StepHeading step={2} total={TOTAL} subtitle="Poder vs. Interés" title={`¿Cuánto poder e interés tiene ${s.name}?`} />
            <div className="grid gap-5 sm:grid-cols-2">
              <Toggle label="Poder sobre el proyecto" value={s.power} onChange={(v) => set("power", v)} />
              <Toggle label="Interés en el proyecto" value={s.interest} onChange={(v) => set("interest", v)} />
            </div>
            {touched && !valid && <p className="text-xs text-semaforo-rojo">Selecciona poder e interés.</p>}
            {q && (
              <div className="rounded-xl bg-kruger-orange-soft p-4 text-sm">
                <p className="font-semibold text-kruger-dark">
                  Estrategia: {q.strategy} <span className="font-normal text-kruger-dark/65">· {q.detail}</span>
                </p>
                <p className="mt-1 text-kruger-dark/75">
                  Comunicación: <strong>{q.method}</strong> — {q.channel}
                </p>
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <StepHeading step={3} total={TOTAL} subtitle="Matriz de Involucramiento" title="¿Cuál es su nivel de involucramiento actual y el deseado?" />
            <LevelPicker label="Actual" value={s.current_level} onChange={(v) => set("current_level", v)} />
            <LevelPicker label="Deseado" value={s.desired_level} onChange={(v) => set("desired_level", v)} />
            {touched && (!s.current_level || !s.desired_level) && (
              <p className="text-xs text-semaforo-rojo">Selecciona el nivel actual y el deseado.</p>
            )}
            {gap && (
              <>
                {needsPriorityEngagement(s) && (
                  <div className="flex gap-2 rounded-xl border border-semaforo-ambar/40 bg-semaforo-ambar/10 p-3 text-sm text-kruger-dark">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-semaforo-ambar" />
                    Alto poder con brecha negativa: se generará una Alerta de Involucramiento Prioritario en el Dashboard.
                  </div>
                )}
                <Field
                  label="Plan de acción para cerrar la brecha"
                  htmlFor="stk_plan"
                  error={err(!s.action_plan.trim(), "Define un plan de acción.")}
                >
                  <input id="stk_plan" className={inputClass} value={s.action_plan} onChange={(e) => set("action_plan", e.target.value)} />
                </Field>
              </>
            )}
          </>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between gap-3 border-t border-kruger-gray/20 pt-6">
        <button type="button" className={btnGhost} onClick={() => (step === 1 ? onCancel() : setStep(step - 1))}>
          <ArrowLeft className="h-4 w-4" /> {step === 1 ? "Cancelar" : "Atrás"}
        </button>
        <button type="submit" aria-disabled={!valid} className={clsx(btnPrimary, !valid && "bg-kruger-gray hover:bg-kruger-gray")}>
          {step === TOTAL ? (
            <>
              <Check className="h-4 w-4" /> Guardar interesado
            </>
          ) : (
            <>
              Siguiente <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: Level | ""; onChange: (v: Level) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-kruger-dark">{label}</legend>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {(["Alto", "Bajo"] as const).map((v) => (
          <label
            key={v}
            className={clsx(
              "cursor-pointer rounded-xl border-2 px-4 py-2.5 text-center text-sm font-semibold transition focus-within:ring-4 focus-within:ring-kruger-orange/15",
              value === v ? "border-kruger-orange bg-kruger-orange-soft text-kruger-orange" : "border-kruger-gray/30 text-kruger-dark",
            )}
          >
            <input type="radio" className="sr-only" checked={value === v} onChange={() => onChange(v)} />
            {v}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function LevelPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: EngagementLevel | "";
  onChange: (v: EngagementLevel) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-kruger-dark">{label}</legend>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {ENGAGEMENT_LEVELS.map((l) => (
          <label
            key={l.value}
            className={clsx(
              "cursor-pointer rounded-xl border-2 px-2 py-2 text-center text-xs font-semibold transition focus-within:ring-4 focus-within:ring-kruger-orange/15",
              value === l.value ? "border-kruger-orange bg-kruger-orange-soft text-kruger-orange" : "border-kruger-gray/30 text-kruger-dark",
            )}
          >
            <input type="radio" className="sr-only" checked={value === l.value} onChange={() => onChange(l.value)} />
            {l.label} ({l.code})
          </label>
        ))}
      </div>
    </fieldset>
  );
}
