"use client";

import { useState } from "react";
import clsx from "clsx";
import { Check, ShieldAlert } from "lucide-react";
import { RISK_OWNER_MESSAGE, STRATEGIES, emv, isRiskStepValid, num, riskStatement, usd } from "@/lib/planning";
import type { Project, Risk, RiskType } from "@/lib/types";
import { Field, StepHeading, inputClass } from "../acta/fields";
import { ErrorText, Hint, WizardFrame } from "../wizard";
import { PeopleList } from "./PeopleList";

const TOTAL = 4;

/** Cuestionario del riesgo (4 preguntas obligatorias del documento de diseño + datos para EMV). */
export function RiskForm({ project, initial, onSave, onCancel }: { project: Project; initial: Risk; onSave: (r: Risk) => void; onCancel: () => void }) {
  const [step, setStep] = useState(1);
  const [r, setR] = useState<Risk>(initial);
  const [touched, setTouched] = useState(false);
  const set = <K extends keyof Risk>(k: K, v: Risk[K]) => setR((x) => ({ ...x, [k]: v }));
  const valid = isRiskStepValid(step, r);

  return (
    <WizardFrame
      step={step}
      total={TOTAL}
      valid={valid}
      onBack={() => (step === 1 ? onCancel() : setStep(step - 1))}
      backLabel={step === 1 ? "Cancelar" : "Atrás"}
      onNext={() => {
        if (!valid) return setTouched(true);
        setTouched(false);
        if (step === TOTAL) onSave(r);
        else setStep(step + 1);
      }}
      nextLabel={step === TOTAL ? "Guardar riesgo" : "Siguiente"}
      nextIcon={step === TOTAL ? <Check className="h-4 w-4" /> : undefined}
    >
      <PeopleList project={project} />

      {step === 1 && (
        <>
          <StepHeading step={1} total={TOTAL} subtitle="Descripción" title="¿Cuál es el riesgo (evento incierto)?" />
          <Hint>Metalenguaje del riesgo: “Debido a [causa], puede ocurrir [evento], lo que provocaría [efecto]”.</Hint>
          <Field label="Causa (hecho actual)" htmlFor="cause">
            <input id="cause" autoFocus className={inputClass} value={r.cause} onChange={(e) => set("cause", e.target.value)} />
          </Field>
          <Field label="Evento incierto" htmlFor="event">
            <input id="event" className={inputClass} value={r.event} onChange={(e) => set("event", e.target.value)} />
          </Field>
          <Field label="Efecto sobre los objetivos" htmlFor="effect">
            <input id="effect" className={inputClass} value={r.effect} onChange={(e) => set("effect", e.target.value)} />
          </Field>
          <ErrorText show={touched && !valid}>Completa causa, evento y efecto.</ErrorText>
        </>
      )}

      {step === 2 && (
        <>
          <StepHeading step={2} total={TOTAL} subtitle="Tipo e impacto" title="¿Es una amenaza o una oportunidad, y cuál es su impacto potencial?" />
          <fieldset>
            <legend className="text-sm font-medium text-kruger-dark">Tipo</legend>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:max-w-sm">
              {(["Amenaza", "Oportunidad"] as RiskType[]).map((t) => (
                <label
                  key={t}
                  className={clsx(
                    "cursor-pointer rounded-xl border-2 px-4 py-2.5 text-center text-sm font-semibold transition focus-within:ring-4 focus-within:ring-kruger-orange/15",
                    r.type === t ? "border-kruger-orange bg-kruger-orange-soft text-kruger-orange" : "border-kruger-gray/30 text-kruger-dark",
                  )}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    checked={r.type === t}
                    onChange={() => setR((x) => ({ ...x, type: t, strategy: x.type === t ? x.strategy : "" }))}
                  />
                  {t}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Probabilidad (%)" htmlFor="prob" hint="Entre 1 y 99. Al 100% ya no es riesgo sino incidente.">
              <input id="prob" type="number" min={1} max={99} className={inputClass} value={r.probability} onChange={(e) => set("probability", e.target.value)} />
            </Field>
            <Field label="Impacto monetario (USD)" htmlFor="impact">
              <input id="impact" type="number" min={0} step="0.01" className={inputClass} value={r.impact} onChange={(e) => set("impact", e.target.value)} />
            </Field>
          </div>
          {num(r.probability) > 0 && num(r.impact) > 0 && (
            <p className="rounded-xl bg-kruger-orange-soft px-4 py-3 text-sm text-kruger-dark">
              Valor Monetario Esperado (EMV) = {r.probability}% × {usd(num(r.impact))} = <strong>{usd(emv(r))}</strong>
            </p>
          )}
          <ErrorText show={touched && !valid}>Selecciona el tipo, una probabilidad entre 1 y 99 y un impacto mayor a 0.</ErrorText>
        </>
      )}

      {step === 3 && r.type && (
        <>
          <StepHeading step={3} total={TOTAL} subtitle="Respuesta" title="¿Cuál es la estrategia de respuesta planificada?" />
          <div className="grid gap-2 sm:grid-cols-2">
            {STRATEGIES[r.type].map((st) => (
              <label
                key={st.value}
                className={clsx(
                  "cursor-pointer rounded-xl border-2 p-3 transition focus-within:ring-4 focus-within:ring-kruger-orange/15",
                  r.strategy === st.value ? "border-kruger-orange bg-kruger-orange-soft" : "border-kruger-gray/30",
                )}
              >
                <input type="radio" className="sr-only" checked={r.strategy === st.value} onChange={() => set("strategy", st.value)} />
                <span className="block text-sm font-semibold text-kruger-dark">{st.value}</span>
                <span className="block text-xs text-kruger-dark/65">{st.detail}</span>
              </label>
            ))}
          </div>
          <Field label="Acciones de respuesta" htmlFor="resp">
            <textarea id="resp" rows={2} className={inputClass} value={r.response} onChange={(e) => set("response", e.target.value)} />
          </Field>
          <ErrorText show={touched && !valid}>Selecciona una estrategia y describe la respuesta.</ErrorText>
        </>
      )}

      {step === 4 && (
        <>
          <StepHeading step={4} total={TOTAL} subtitle="Dueño del riesgo" title="¿Quién es el dueño asignado (Risk Owner)?" />
          <Field label="Dueño del riesgo (campo bloqueante)" htmlFor="owner" hint="Monitorea los disparadores y ejecuta la respuesta planificada.">
            <input id="owner" list="people" autoFocus className={inputClass} value={r.owner} onChange={(e) => set("owner", e.target.value)} />
          </Field>
          {touched && !valid && (
            <div role="alert" className="flex gap-2 rounded-xl border border-semaforo-rojo/30 bg-semaforo-rojo/5 p-3 text-sm text-kruger-dark">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-semaforo-rojo" />
              {RISK_OWNER_MESSAGE}
            </div>
          )}
          <p className="rounded-xl bg-kruger-gray-soft px-4 py-3 text-sm text-kruger-dark/80">{riskStatement(r)}</p>
        </>
      )}
    </WizardFrame>
  );
}
