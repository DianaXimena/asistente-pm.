"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, FileCheck2, Plus, Trash2 } from "lucide-react";
import { AUTHORITY_OPTIONS, EMPTY_ACTA, isStepValid, isValidEmail } from "@/lib/acta";
import { ACTA_DRAFT_KEY, useProject } from "@/lib/store";
import type { ActaFormData, PmAuthority } from "@/lib/types";
import { RequireProject } from "../RequireProject";
import { ActaSummary } from "./ActaSummary";
import { Field, StepDots, StepHeading, inputClass } from "./fields";

const TOTAL = 4;

/**
 * Flujo del cuestionario del Acta de Constitución (documento "Gestión de Proyectos 2"):
 * una sola pregunta por pantalla → Generar → Resumen y enlace a Drive.
 */
export function ActaWizard() {
  return <RequireProject>{() => <Wizard />}</RequireProject>;
}

function Wizard() {
  const router = useRouter();
  const { project, hydrated, submitActa } = useProject();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<ActaFormData>(EMPTY_ACTA);
  const [loaded, setLoaded] = useState(false);
  const [touched, setTouched] = useState(false);

  // Carga el borrador guardado o, si ya existe, el Acta generada.
  useEffect(() => {
    if (!hydrated || loaded) return;
    try {
      const raw = localStorage.getItem(ACTA_DRAFT_KEY);
      if (raw) setData({ ...EMPTY_ACTA, ...(JSON.parse(raw) as ActaFormData) });
      else if (project?.acta) setData(project.acta);
    } catch {
      if (project?.acta) setData(project.acta);
    }
    setLoaded(true);
  }, [hydrated, loaded, project?.acta]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(ACTA_DRAFT_KEY, JSON.stringify(data));
    } catch {
      /* ignorar */
    }
  }, [data, loaded]);

  const update = <K extends keyof ActaFormData>(key: K, value: ActaFormData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const valid = step <= TOTAL && isStepValid(step, data);

  const next = () => {
    if (!valid) {
      setTouched(true);
      return;
    }
    setTouched(false);
    if (step === TOTAL) {
      submitActa(data);
      try {
        localStorage.removeItem(ACTA_DRAFT_KEY);
      } catch {
        /* ignorar */
      }
    }
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const back = () => {
    setTouched(false);
    if (step === 1) router.push("/");
    else setStep((s) => s - 1);
  };

  if (step > TOTAL) return <ActaSummary data={data} onEdit={() => setStep(1)} />;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        next();
      }}
      className="rounded-2xl border border-kruger-gray/25 bg-white p-6 shadow-card sm:p-8"
      noValidate
    >
      <StepDots current={step} total={TOTAL} />

      <div className="mt-6 min-h-[18rem] space-y-6">
        {step === 1 && (
          <>
            <StepHeading
              step={1}
              total={TOTAL}
              subtitle="Propósito y Caso de Negocio"
              title="¿Qué problema o necesidad resuelve este proyecto?"
            />
            <Field
              label="Propósito y objetivo medible"
              htmlFor="business_case"
              hint="El objetivo debe ser medible para definir el criterio de éxito."
              error={touched && !valid ? "Describe el propósito (mínimo 10 caracteres)." : undefined}
            >
              <textarea
                id="business_case"
                rows={4}
                autoFocus
                className={inputClass}
                placeholder="Ejemplo: Reducir los tiempos de entrega en un 30% mediante la digitalización del almacén."
                value={data.business_case}
                onChange={(e) => update("business_case", e.target.value)}
              />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <StepHeading
              step={2}
              total={TOTAL}
              subtitle="Director del Proyecto y Nivel de Autoridad"
              title="¿Quién liderará el proyecto y hasta dónde llega su autoridad?"
            />
            <Field
              label="Nombre del Director del Proyecto (PM)"
              htmlFor="pm_name"
              error={touched && !data.pm_name.trim() ? "Ingresa el nombre del PM." : undefined}
            >
              <input
                id="pm_name"
                autoFocus
                className={inputClass}
                placeholder="Nombre y apellido"
                value={data.pm_name}
                onChange={(e) => update("pm_name", e.target.value)}
              />
            </Field>
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium text-kruger-dark">Nivel de autoridad</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {AUTHORITY_OPTIONS.map((opt) => {
                  const active = data.pm_authority === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={clsx(
                        "cursor-pointer rounded-xl border-2 p-4 transition focus-within:ring-4 focus-within:ring-kruger-orange/15",
                        active
                          ? "border-kruger-orange bg-kruger-orange-soft"
                          : "border-kruger-gray/30 hover:border-kruger-orange/50",
                      )}
                    >
                      <input
                        type="radio"
                        name="pm_authority"
                        value={opt.value}
                        checked={active}
                        onChange={() => update("pm_authority", opt.value as PmAuthority)}
                        className="sr-only"
                      />
                      <span className="block text-sm font-semibold text-kruger-dark">{opt.title}</span>
                      <span className="mt-1 block text-xs text-kruger-dark/65">{opt.detail}</span>
                    </label>
                  );
                })}
              </div>
              {touched && !data.pm_authority && <p className="text-xs text-semaforo-rojo">Selecciona un nivel de autoridad.</p>}
            </fieldset>
          </>
        )}

        {step === 3 && (
          <>
            <StepHeading
              step={3}
              total={TOTAL}
              subtitle="Presupuesto y Cronograma de Hitos"
              title="¿Cuáles son los límites iniciales de tiempo y costo?"
            />
            <Field
              label="Presupuesto inicial asignado (dólares)"
              htmlFor="budget"
              error={touched && !(Number(data.budget) > 0) ? "Ingresa un monto mayor a 0." : undefined}
            >
              <div className="flex">
                <span className="flex items-center rounded-l-xl border border-r-0 border-kruger-gray/40 bg-kruger-gray-soft px-4 text-sm font-medium text-kruger-dark/70">
                  USD
                </span>
                <input
                  id="budget"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  autoFocus
                  className={clsx(inputClass, "rounded-l-none")}
                  placeholder="0.00"
                  value={data.budget}
                  onChange={(e) => update("budget", e.target.value)}
                />
              </div>
            </Field>
            <Field
              label="Fecha límite del proyecto"
              htmlFor="deadline"
              error={touched && !data.deadline ? "Selecciona la fecha límite." : undefined}
            >
              <input
                id="deadline"
                type="date"
                className={clsx(inputClass, "sm:max-w-xs")}
                value={data.deadline}
                onChange={(e) => update("deadline", e.target.value)}
              />
            </Field>

            <div className="space-y-3">
              <p className="text-sm font-medium text-kruger-dark">
                Hitos principales <span className="font-normal text-kruger-dark/55">(opcional)</span>
              </p>
              {data.milestones.map((m, idx) => (
                <div key={idx} className="flex flex-col gap-2 sm:flex-row">
                  <input
                    aria-label={`Nombre del hito ${idx + 1}`}
                    className={inputClass}
                    placeholder="Nombre del hito"
                    value={m.name}
                    onChange={(e) =>
                      update(
                        "milestones",
                        data.milestones.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)),
                      )
                    }
                  />
                  <div className="flex gap-2">
                    <input
                      type="date"
                      aria-label={`Fecha del hito ${idx + 1}`}
                      className={clsx(inputClass, "sm:w-44")}
                      value={m.date}
                      onChange={(e) =>
                        update(
                          "milestones",
                          data.milestones.map((x, i) => (i === idx ? { ...x, date: e.target.value } : x)),
                        )
                      }
                    />
                    <button
                      type="button"
                      aria-label={`Eliminar hito ${idx + 1}`}
                      onClick={() => update("milestones", data.milestones.filter((_, i) => i !== idx))}
                      className="shrink-0 rounded-xl border border-kruger-gray/40 px-3 text-kruger-dark/60 transition hover:border-semaforo-rojo hover:text-semaforo-rojo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {touched && data.milestones.some((m) => !m.name.trim() || !m.date) && (
                <p className="text-xs text-semaforo-rojo">Completa nombre y fecha de cada hito, o elimínalo.</p>
              )}
              <button
                type="button"
                onClick={() => update("milestones", [...data.milestones, { name: "", date: "" }])}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-kruger-orange hover:underline"
              >
                <Plus className="h-4 w-4" /> Agregar hito
              </button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <StepHeading
              step={4}
              total={TOTAL}
              subtitle="Patrocinador (Sponsor)"
              title="¿Quién autoriza formalmente el proyecto?"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Nombre del Patrocinador"
                htmlFor="sponsor_name"
                error={touched && !data.sponsor_name.trim() ? "Ingresa el nombre." : undefined}
              >
                <input
                  id="sponsor_name"
                  autoFocus
                  className={inputClass}
                  value={data.sponsor_name}
                  onChange={(e) => update("sponsor_name", e.target.value)}
                />
              </Field>
              <Field
                label="Cargo"
                htmlFor="sponsor_role"
                error={touched && !data.sponsor_role.trim() ? "Ingresa el cargo." : undefined}
              >
                <input
                  id="sponsor_role"
                  className={inputClass}
                  value={data.sponsor_role}
                  onChange={(e) => update("sponsor_role", e.target.value)}
                />
              </Field>
            </div>
            <Field
              label="Correo corporativo"
              htmlFor="sponsor_email"
              hint="Se usará para la solicitud de aprobación digital."
              error={touched && !isValidEmail(data.sponsor_email) ? "Ingresa un correo válido." : undefined}
            >
              <input
                id="sponsor_email"
                type="email"
                autoComplete="off"
                className={inputClass}
                placeholder="nombre@empresa.com"
                value={data.sponsor_email}
                onChange={(e) => update("sponsor_email", e.target.value)}
              />
            </Field>
          </>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between gap-3 border-t border-kruger-gray/20 pt-6">
        <button
          type="button"
          onClick={back}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-kruger-dark/70 transition hover:bg-kruger-gray-soft"
        >
          <ArrowLeft className="h-4 w-4" /> {step === 1 ? "Dashboard" : "Atrás"}
        </button>
        <button
          type="submit"
          aria-disabled={!valid}
          className={clsx(
            "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition",
            valid ? "bg-kruger-orange hover:bg-kruger-orange-dark" : "cursor-not-allowed bg-kruger-gray",
          )}
        >
          {step === TOTAL ? (
            <>
              <FileCheck2 className="h-4 w-4" /> Generar Borrador del Acta
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
