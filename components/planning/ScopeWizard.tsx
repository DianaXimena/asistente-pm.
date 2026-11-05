"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, LayoutDashboard, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { EMPTY_SCOPE, isScopeStepValid, isWorkPackageComplete, newDeliverable, newWorkPackage, wbsCode } from "@/lib/planning";
import { useProject } from "@/lib/store";
import { useDraft } from "@/lib/useDraft";
import type { Project, ScopeBaseline, WorkPackage } from "@/lib/types";
import { Field, StepHeading, inputClass } from "../acta/fields";
import { QuestionnaireGate } from "../QuestionnaireGate";
import { btnPrimary, btnSecondary, card } from "../ui";
import { ErrorText, Hint, WizardFrame } from "../wizard";
import { PeopleList } from "./PeopleList";

const TOTAL = 5;

export function ScopeWizard() {
  return <QuestionnaireGate id="linea-base-alcance">{(p) => <Wizard project={p} />}</QuestionnaireGate>;
}

function Wizard({ project }: { project: Project }) {
  const { saveScope } = useProject();
  const [s, setS, clearDraft] = useDraft<ScopeBaseline>(`asistente-pm:${project.project_id}:scope-draft`, () => project.scope ?? EMPTY_SCOPE);
  const [step, setStep] = useState(1);
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState(false);
  const set = <K extends keyof ScopeBaseline>(k: K, v: ScopeBaseline[K]) => setS((x) => ({ ...x, [k]: v }));
  const valid = step === TOTAL || isScopeStepValid(step, s);
  const err = (cond: boolean) => touched && cond;

  if (done) return <Done />;

  const next = () => {
    if (!valid) return setTouched(true);
    setTouched(false);
    if (step === TOTAL) {
      saveScope(s);
      clearDraft();
      setDone(true);
    } else setStep(step + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateWp = (di: number, wi: number, patch: Partial<WorkPackage>) =>
    set(
      "deliverables",
      s.deliverables.map((d, i) =>
        i !== di ? d : { ...d, work_packages: d.work_packages.map((w, j) => (j === wi ? { ...w, ...patch } : w)) },
      ),
    );

  return (
    <WizardFrame
      step={step}
      total={TOTAL}
      valid={valid}
      onBack={() => (step === 1 ? history.back() : setStep(step - 1))}
      onNext={next}
      backLabel={step === 1 ? "Salir" : "Atrás"}
      nextLabel={step === TOTAL ? "Aprobar Línea Base del Alcance" : "Siguiente"}
      nextIcon={step === TOTAL ? <ShieldCheck className="h-4 w-4" /> : undefined}
    >
      <PeopleList project={project} />

      {step === 1 && (
        <>
          <StepHeading step={1} total={TOTAL} subtitle="Enunciado del Alcance" title="¿Qué producto, servicio o resultado entregará el proyecto?" />
          <Field label="Descripción del alcance del producto" htmlFor="product" hint="Características del producto que el proyecto debe crear (elaboración progresiva del Acta).">
            <textarea id="product" rows={4} autoFocus className={inputClass} value={s.product_description} onChange={(e) => set("product_description", e.target.value)} />
          </Field>
          <ErrorText show={err(!s.product_description.trim())}>Describe el alcance del producto.</ErrorText>
          <Field label="Criterios de aceptación" htmlFor="accept" hint="Condiciones que deben cumplirse para que el cliente acepte los entregables.">
            <textarea id="accept" rows={3} className={inputClass} value={s.acceptance_criteria} onChange={(e) => set("acceptance_criteria", e.target.value)} />
          </Field>
          <ErrorText show={err(!s.acceptance_criteria.trim())}>Define los criterios de aceptación.</ErrorText>
        </>
      )}

      {step === 2 && (
        <>
          <StepHeading step={2} total={TOTAL} subtitle="EDT · Nivel 1" title="¿Cuáles son los entregables principales?" />
          <Hint>Regla del 100%: la EDT debe incluir todo el trabajo del proyecto, y nada más. Incluye también la gestión del proyecto si aplica.</Hint>
          <ul className="space-y-2">
            {s.deliverables.map((d, i) => (
              <li key={d.id} className="flex items-center gap-2">
                <span className="w-8 shrink-0 text-sm font-semibold text-kruger-orange">{wbsCode(i)}</span>
                <input
                  aria-label={`Entregable ${wbsCode(i)}`}
                  className={inputClass}
                  placeholder="Nombre del entregable"
                  value={d.name}
                  onChange={(e) => set("deliverables", s.deliverables.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                />
                <RemoveBtn label={`Eliminar entregable ${wbsCode(i)}`} onClick={() => set("deliverables", s.deliverables.filter((_, j) => j !== i))} />
              </li>
            ))}
          </ul>
          <AddBtn onClick={() => set("deliverables", [...s.deliverables, newDeliverable()])}>Agregar entregable</AddBtn>
          <ErrorText show={err(true)}>Agrega al menos un entregable y nombra todos.</ErrorText>
        </>
      )}

      {step === 3 && (
        <>
          <StepHeading step={3} total={TOTAL} subtitle="EDT · Paquetes de trabajo + Diccionario" title="Descompón cada entregable en paquetes de trabajo" />
          <Hint>
            Un paquete de trabajo es el nivel más bajo de la EDT: se puede estimar en costo y duración, y tiene un responsable. El
            Diccionario de la EDT describe el trabajo y su criterio de aceptación.
          </Hint>
          {s.deliverables.map((d, di) => (
            <section key={d.id} className="space-y-3 rounded-2xl border border-kruger-gray/25 p-4">
              <h3 className="text-sm font-semibold text-kruger-dark">
                <span className="text-kruger-orange">{wbsCode(di)}</span> {d.name}
              </h3>
              {d.work_packages.map((w, wi) => (
                <div key={w.id} className={`space-y-3 rounded-xl p-4 ${err(!isWorkPackageComplete(w)) ? "bg-semaforo-rojo/5" : "bg-kruger-gray-soft"}`}>
                  <div className="flex items-center gap-2">
                    <span className="w-10 shrink-0 text-sm font-semibold text-kruger-orange">{wbsCode(di, wi)}</span>
                    <input
                      aria-label={`Paquete ${wbsCode(di, wi)}`}
                      className={inputClass}
                      placeholder="Nombre del paquete de trabajo"
                      value={w.name}
                      onChange={(e) => updateWp(di, wi, { name: e.target.value })}
                    />
                    <RemoveBtn
                      label={`Eliminar paquete ${wbsCode(di, wi)}`}
                      onClick={() =>
                        set(
                          "deliverables",
                          s.deliverables.map((x, i) => (i !== di ? x : { ...x, work_packages: x.work_packages.filter((_, j) => j !== wi) })),
                        )
                      }
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-kruger-dark/65">Descripción del trabajo (Diccionario)</span>
                      <textarea
                        aria-label={`Descripción del trabajo ${wbsCode(di, wi)}`}
                        rows={2}
                        className={inputClass}
                        placeholder="Descripción del trabajo (Diccionario)"
                        value={w.description}
                        onChange={(e) => updateWp(di, wi, { description: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-kruger-dark/65">Criterio de aceptación</span>
                      <textarea
                        aria-label={`Criterio de aceptación ${wbsCode(di, wi)}`}
                        rows={2}
                        className={inputClass}
                        placeholder="Criterio de aceptación"
                        value={w.acceptance}
                        onChange={(e) => updateWp(di, wi, { acceptance: e.target.value })}
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-kruger-dark/65">Responsable</span>
                    <input
                      aria-label={`Responsable ${wbsCode(di, wi)}`}
                      list="people"
                      className={inputClass}
                      placeholder="Responsable"
                      value={w.owner}
                      onChange={(e) => updateWp(di, wi, { owner: e.target.value })}
                    />
                  </label>
                </div>
              ))}
              <AddBtn
                onClick={() =>
                  set("deliverables", s.deliverables.map((x, i) => (i !== di ? x : { ...x, work_packages: [...x.work_packages, newWorkPackage()] })))
                }
              >
                Agregar paquete de trabajo
              </AddBtn>
            </section>
          ))}
          <ErrorText show={err(true)}>Cada entregable necesita al menos un paquete con nombre, descripción, criterio de aceptación y responsable.</ErrorText>
        </>
      )}

      {step === 4 && (
        <>
          <StepHeading step={4} total={TOTAL} subtitle="Límites del alcance" title="¿Qué queda fuera y sobre qué bases se planifica?" />
          <Field label="Exclusiones del proyecto" htmlFor="excl" hint="Lo que explícitamente NO forma parte del alcance; evita la corrupción del alcance (scope creep).">
            <textarea id="excl" rows={3} autoFocus className={inputClass} value={s.exclusions} onChange={(e) => set("exclusions", e.target.value)} />
          </Field>
          <ErrorText show={err(!s.exclusions.trim())}>Indica las exclusiones.</ErrorText>
          <Field label="Supuestos" htmlFor="sup" hint="Factores que se consideran verdaderos sin prueba (se registran y validan).">
            <textarea id="sup" rows={2} className={inputClass} value={s.assumptions} onChange={(e) => set("assumptions", e.target.value)} />
          </Field>
          <ErrorText show={err(!s.assumptions.trim())}>Indica los supuestos.</ErrorText>
          <Field label="Restricciones" htmlFor="res" hint="Límites fijos: fechas, presupuesto, regulaciones, recursos.">
            <textarea id="res" rows={2} className={inputClass} value={s.constraints} onChange={(e) => set("constraints", e.target.value)} />
          </Field>
          <ErrorText show={err(!s.constraints.trim())}>Indica las restricciones.</ErrorText>
        </>
      )}

      {step === 5 && (
        <>
          <StepHeading step={5} total={TOTAL} subtitle="Revisión" title="Revisa la Línea Base del Alcance antes de aprobarla" />
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <Item k="Alcance del producto" v={s.product_description} wide />
            <Item k="Criterios de aceptación" v={s.acceptance_criteria} wide />
            <Item k="Exclusiones" v={s.exclusions} />
            <Item k="Supuestos" v={s.assumptions} />
            <Item k="Restricciones" v={s.constraints} />
          </dl>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-kruger-dark/55">EDT</p>
            <ul className="mt-2 space-y-2 text-sm">
              {s.deliverables.map((d, i) => (
                <li key={d.id}>
                  <p className="font-semibold text-kruger-dark">
                    <span className="text-kruger-orange">{wbsCode(i)}</span> {d.name}
                  </p>
                  <ul className="ml-6 mt-1 space-y-1 border-l-2 border-kruger-orange/30 pl-3">
                    {d.work_packages.map((w, j) => (
                      <li key={w.id} className="text-kruger-dark/80">
                        <span className="font-medium text-kruger-orange">{wbsCode(i, j)}</span> {w.name}{" "}
                        <span className="text-xs text-kruger-dark/55">· {w.owner}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </WizardFrame>
  );
}

function Item({ k, v, wide }: { k: string; v: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-kruger-dark/55">{k}</dt>
      <dd className="mt-1 whitespace-pre-line text-kruger-dark">{v}</dd>
    </div>
  );
}

export function AddBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 text-sm font-medium text-kruger-orange hover:underline">
      <Plus className="h-4 w-4" /> {children}
    </button>
  );
}

export function RemoveBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="shrink-0 rounded-xl border border-kruger-gray/40 p-3 text-kruger-dark/60 transition hover:border-semaforo-rojo hover:text-semaforo-rojo"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

export function Done({ title = "Línea base aprobada" }: { title?: string }) {
  return (
    <div className={card}>
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-semaforo-verde" />
        <div>
          <p className="text-sm font-semibold text-kruger-dark">{title}</p>
          <p className="mt-1 text-sm text-kruger-dark/65">El progreso de Planificación se actualizó en el Dashboard.</p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3 border-t border-kruger-gray/20 pt-6">
        <Link href="/proyecto" className={btnPrimary}>
          <LayoutDashboard className="h-4 w-4" /> Volver al Dashboard
        </Link>
        <button type="button" className={btnSecondary} onClick={() => location.reload()}>
          Ver / editar
        </button>
      </div>
    </div>
  );
}
