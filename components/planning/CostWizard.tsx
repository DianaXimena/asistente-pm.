"use client";

import { useState } from "react";
import clsx from "clsx";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { contingencyFromRisks, costSummary, isCostStepValid, num, riskInputSource, uid, usd, workPackages } from "@/lib/planning";
import { findInput, useProject } from "@/lib/store";
import { useDraft } from "@/lib/useDraft";
import type { CostBaseline, CostItem, CostMethod, Project } from "@/lib/types";
import { Field, StepHeading, inputClass } from "../acta/fields";
import { QuestionnaireGate } from "../QuestionnaireGate";
import { ErrorText, Hint, WizardFrame } from "../wizard";
import { AddBtn, Done, RemoveBtn } from "./ScopeWizard";

const TOTAL = 4;
const METHODS: { value: CostMethod; detail: string }[] = [
  { value: "Análoga", detail: "Basada en proyectos similares anteriores. Rápida, menos precisa." },
  { value: "Paramétrica", detail: "Relación estadística: costo unitario × cantidad." },
  { value: "Ascendente (bottom-up)", detail: "Suma del detalle de cada paquete de trabajo. La más precisa." },
];

export function CostWizard() {
  return <QuestionnaireGate id="linea-base-costos">{(p) => <Wizard project={p} />}</QuestionnaireGate>;
}

function initialCosts(project: Project): CostBaseline {
  const base: CostBaseline = project.costs ?? { method: "", items: [], manual_contingency: "", management_reserve_pct: "" };
  const wps = workPackages(project.scope);
  if (wps.length === 0) return base;
  const prev = new Map(base.items.map((i) => [i.id, i]));
  return { ...base, items: wps.map((w) => ({ id: w.id, name: `${w.code} ${w.name}`, estimate: prev.get(w.id)?.estimate ?? "" })) };
}

function Wizard({ project }: { project: Project }) {
  const { saveCosts } = useProject();
  const [c, setC, clearDraft] = useDraft<CostBaseline>(`asistente-pm:${project.project_id}:costs-draft`, () => initialCosts(project));
  const [step, setStep] = useState(1);
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState(false);
  const fromWbs = findInput(project, "linea-base-alcance")?.source !== "archivo" && workPackages(project.scope).length > 0;
  const risksFromFile = riskInputSource(project) === "archivo";
  const set = <K extends keyof CostBaseline>(k: K, v: CostBaseline[K]) => setC((x) => ({ ...x, [k]: v }));
  const setItem = (idx: number, patch: Partial<CostItem>) => set("items", c.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const valid = step === TOTAL || isCostStepValid(step, c, project);
  const sum = costSummary(c, project);
  const reserve = contingencyFromRisks(project.risks);

  if (done) return <Done title="Línea Base de Costos aprobada" />;

  return (
    <WizardFrame
      step={step}
      total={TOTAL}
      valid={valid}
      onBack={() => (step === 1 ? history.back() : setStep(step - 1))}
      backLabel={step === 1 ? "Salir" : "Atrás"}
      onNext={() => {
        if (!valid) return setTouched(true);
        setTouched(false);
        if (step === TOTAL) {
          saveCosts(c);
          clearDraft();
          setDone(true);
        } else setStep(step + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      nextLabel={step === TOTAL ? "Aprobar Línea Base de Costos" : "Siguiente"}
      nextIcon={step === TOTAL ? <ShieldCheck className="h-4 w-4" /> : undefined}
    >
      {step === 1 && (
        <>
          <StepHeading step={1} total={TOTAL} subtitle="Estimación de costos" title="¿Cuánto cuesta cada paquete de trabajo?" />
          <fieldset>
            <legend className="text-sm font-medium text-kruger-dark">Método de estimación</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {METHODS.map((m) => (
                <label
                  key={m.value}
                  className={clsx(
                    "cursor-pointer rounded-xl border-2 p-3 transition focus-within:ring-4 focus-within:ring-kruger-orange/15",
                    c.method === m.value ? "border-kruger-orange bg-kruger-orange-soft" : "border-kruger-gray/30",
                  )}
                >
                  <input type="radio" className="sr-only" checked={c.method === m.value} onChange={() => set("method", m.value)} />
                  <span className="block text-sm font-semibold text-kruger-dark">{m.value}</span>
                  <span className="mt-1 block text-xs text-kruger-dark/65">{m.detail}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {!fromWbs && <Hint>La EDT se cargó como archivo: agrega los paquetes de trabajo o rubros a estimar.</Hint>}
          <ul className="space-y-2">
            {c.items.map((it, idx) => (
              <li key={it.id} className="flex flex-col gap-2 rounded-xl bg-kruger-gray-soft p-3 sm:flex-row sm:items-center">
                {fromWbs ? (
                  <span className="flex-1 text-sm font-medium text-kruger-dark">{it.name}</span>
                ) : (
                  <input aria-label={`Rubro ${idx + 1}`} className={inputClass} placeholder="Paquete o rubro" value={it.name} onChange={(e) => setItem(idx, { name: e.target.value })} />
                )}
                <div className="flex gap-2">
                  <div className="flex">
                    <span className="flex items-center rounded-l-xl border border-r-0 border-kruger-gray/40 bg-white px-3 text-xs font-medium text-kruger-dark/70">USD</span>
                    <input
                      aria-label={`Costo de ${it.name || `rubro ${idx + 1}`}`}
                      type="number"
                      min={0}
                      step="0.01"
                      className={clsx(inputClass, "w-40 rounded-l-none")}
                      value={it.estimate}
                      onChange={(e) => setItem(idx, { estimate: e.target.value })}
                    />
                  </div>
                  {!fromWbs && <RemoveBtn label={`Eliminar rubro ${idx + 1}`} onClick={() => set("items", c.items.filter((_, i) => i !== idx))} />}
                </div>
              </li>
            ))}
          </ul>
          {!fromWbs && <AddBtn onClick={() => set("items", [...c.items, { id: uid("CST"), name: "", estimate: "" }])}>Agregar rubro</AddBtn>}
          <p className="text-sm text-kruger-dark">
            Total de estimaciones: <strong>{usd(sum.estimates)}</strong>
          </p>
          <ErrorText show={touched && !valid}>Selecciona el método y asigna un costo mayor a 0 a cada paquete.</ErrorText>
        </>
      )}

      {step === 2 && (
        <>
          <StepHeading step={2} total={TOTAL} subtitle="Reserva de Contingencia" title="¿Cuánto reservar para los riesgos identificados?" />
          <Hint>
            Cubre riesgos identificados (“conocidos-desconocidos”). Está DENTRO de la línea base de costos y el PM la usa directamente
            al activar un plan de respuesta, sin solicitud de cambio.
          </Hint>
          {risksFromFile ? (
            <Field label="Reserva de contingencia (USD)" htmlFor="contingency" hint="El Registro de Riesgos se cargó como archivo: ingresa la suma de EMV calculada en ese documento.">
              <input id="contingency" type="number" min={0} step="0.01" autoFocus className={clsx(inputClass, "sm:max-w-xs")} value={c.manual_contingency} onChange={(e) => set("manual_contingency", e.target.value)} />
            </Field>
          ) : (
            <dl className="grid gap-3 rounded-xl bg-kruger-gray-soft p-4 text-sm sm:grid-cols-3">
              <Row k="Σ EMV Amenazas" v={usd(reserve.threats)} />
              <Row k="− Σ EMV Oportunidades" v={usd(reserve.opportunities)} />
              <Row k="= Reserva de Contingencia" v={usd(reserve.total)} strong />
            </dl>
          )}
          <ErrorText show={touched && !valid}>Ingresa la reserva de contingencia.</ErrorText>
        </>
      )}

      {step === 3 && (
        <>
          <StepHeading step={3} total={TOTAL} subtitle="Reserva de Gestión" title="¿Qué porcentaje de reserva de gestión definió la PMO o la gobernanza?" />
          <Hint>
            Cubre riesgos imprevistos (“desconocidos-desconocidos”). Está FUERA de la línea base y su uso requiere aprobación del
            Patrocinador o del CCB. Referencia del documento de diseño: 5% a 10%.
          </Hint>
          <Field label="Reserva de gestión (% sobre la línea base de costos)" htmlFor="mr">
            <input id="mr" type="number" min={0} max={100} step="0.1" autoFocus className={clsx(inputClass, "sm:max-w-xs")} value={c.management_reserve_pct} onChange={(e) => set("management_reserve_pct", e.target.value)} />
          </Field>
          <ErrorText show={touched && !valid}>Ingresa un porcentaje entre 0 y 100.</ErrorText>
        </>
      )}

      {step === 4 && (
        <>
          <StepHeading step={4} total={TOTAL} subtitle="Revisión" title="Revisa el presupuesto antes de aprobar" />
          <dl className="divide-y divide-kruger-gray/20 rounded-xl border border-kruger-gray/25 text-sm">
            <Line k="Estimaciones de paquetes de trabajo" v={usd(sum.estimates)} />
            <Line k={`+ Reserva de Contingencia (${sum.contingencySource === "riesgos" ? "EMV de riesgos" : "ingresada"})`} v={usd(sum.contingency)} />
            <Line k="= Línea Base de Costos" v={usd(sum.costBaseline)} strong />
            <Line k={`+ Reserva de Gestión (${num(c.management_reserve_pct)}%)`} v={usd(sum.managementReserve)} />
            <Line k="= Presupuesto Total del Proyecto" v={usd(sum.totalBudget)} strong />
          </dl>
          {sum.actaLimit !== null && sum.totalBudget > sum.actaLimit && (
            <div className="flex gap-2 rounded-xl border border-semaforo-rojo/30 bg-semaforo-rojo/5 p-3 text-sm text-kruger-dark">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-semaforo-rojo" />
              El presupuesto total supera el límite aprobado en el Acta ({usd(sum.actaLimit)}). Revisa estimaciones o escala al Patrocinador antes
              de aprobar.
            </div>
          )}
        </>
      )}
    </WizardFrame>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-kruger-dark/60">{k}</dt>
      <dd className={clsx("mt-0.5 font-medium", strong ? "text-kruger-orange" : "text-kruger-dark")}>{v}</dd>
    </div>
  );
}

function Line({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={clsx("flex justify-between gap-4 px-4 py-3", strong && "bg-kruger-orange-soft font-semibold")}>
      <dt className="text-kruger-dark">{k}</dt>
      <dd className="tabular-nums text-kruger-dark">{v}</dd>
    </div>
  );
}
