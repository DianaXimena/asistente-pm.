"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, BookOpen, CheckCircle2, LayoutDashboard, Mail, Pencil, Plus, Send } from "lucide-react";
import { formatDate } from "@/lib/acta";
import { approvalDateError, todayIso } from "@/lib/audit";
import { BAND_GUIDANCE, bacFor, crGovernance } from "@/lib/governance";
import {
  BASELINE_LABEL,
  INCOMPLETE_IMPACT_MESSAGE,
  REGULATORY_MESSAGE,
  VERBAL_MESSAGE,
  impactDimensions,
  isCrOpen,
  isCrStepValid,
  newChangeRequest,
  newIncident,
  routeFor,
} from "@/lib/control";
import { num, usd } from "@/lib/planning";
import { useProject } from "@/lib/store";
import type { BaselineId, ChangeRequest, ChangeType, Project } from "@/lib/types";
import { Field, StepHeading, inputClass } from "../acta/fields";
import { Toggle } from "../execution/LessonsRegister";
import { DriveFilePick } from "../DriveFilePick";
import { phaseOfInput } from "@/lib/drive-upload";
import { PeopleList } from "../planning/PeopleList";
import { QuestionnaireGate } from "../QuestionnaireGate";
import { BlockedAction, type Blocker } from "../BlockedAction";
import { btnPrimary, btnSecondary, card } from "../ui";
import { ErrorText, Hint, WizardFrame } from "../wizard";

const TYPES: ChangeType[] = ["Acción Preventiva", "Acción Correctiva", "Reparación de Defectos", "Actualización"];
const STEP_TITLES = [
  "1 · Entender la solicitud",
  "2 · Impacto integral",
  "3 · Conversar con interesados",
  "4 · Alternativas sin mover la línea base",
  "5–6 · Decisión de gobernanza",
  "7–8 · Implementar y actualizar",
  "9 · Comunicar estado",
];

export function ChangeLog() {
  return <QuestionnaireGate id="solicitud-cambio">{(p) => <Log project={p} />}</QuestionnaireGate>;
}

function Log({ project }: { project: Project }) {
  const { reviewChangeLog } = useProject();
  const [editing, setEditing] = useState<ChangeRequest | null>(null);
  const open = project.change_requests.filter(isCrOpen);

  if (editing) return <ChangeWizard key={editing.id} project={project} initial={editing} onExit={() => setEditing(null)} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-card">
        <p className="text-sm text-kruger-dark">
          <strong>{project.change_requests.length}</strong> solicitudes · <strong>{open.length}</strong> sin resolver
        </p>
        <button type="button" className={btnPrimary} onClick={() => setEditing(newChangeRequest())}>
          <Plus className="h-4 w-4" /> Nueva solicitud de cambio
        </button>
      </div>
      <Hint>Escalera de 9 peldaños: no se envía nada al CCB sin evaluar el impacto integral y sin buscar antes alternativas que no muevan la línea base.</Hint>
      <ul className="space-y-3">
        {project.change_requests.map((cr) => (
          <li key={cr.id} className="rounded-2xl border border-kruger-gray/25 bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-kruger-dark">{cr.what || "Solicitud sin título"}</p>
                <p className="mt-1 text-xs text-kruger-dark/60">
                  {cr.type || "—"} · Solicita: {cr.requester || "—"} · {formatDate(cr.created_at.slice(0, 10))}
                  {cr.route && ` · Decide: ${cr.route === "PM" ? "PM" : "CCB / Gobernanza"}`}
                </p>
                {cr.written_file && (
                  <p className="mt-1 text-xs text-kruger-dark/60">
                    Solicitud escrita:{" "}
                    {cr.written_file_url ? (
                      <a href={cr.written_file_url} target="_blank" rel="noreferrer" className="text-kruger-orange hover:underline">
                        {cr.written_file}
                      </a>
                    ) : (
                      cr.written_file
                    )}
                  </p>
                )}
              </div>
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  cr.status === "Aprobada" || cr.status === "Resuelto sin cambio de línea base"
                    ? "bg-semaforo-verde/10 text-semaforo-verde"
                    : cr.status === "Rechazada"
                      ? "bg-semaforo-rojo/10 text-semaforo-rojo"
                      : "bg-semaforo-ambar/15 text-kruger-dark",
                )}
              >
                {cr.status}
              </span>
            </div>
            {isCrOpen(cr) && (
              <button type="button" onClick={() => setEditing(cr)} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-kruger-orange hover:underline">
                <Pencil className="h-3.5 w-3.5" /> Continuar la escalera
              </button>
            )}
          </li>
        ))}
        {project.change_requests.length === 0 && <li className={clsx(card, "text-center text-sm text-kruger-dark/70")}>Sin solicitudes de cambio registradas.</li>}
      </ul>
      <div className="flex flex-col-reverse justify-between gap-3 border-t border-kruger-gray/25 pt-6 sm:flex-row sm:items-center">
        <Link href="/proyecto" className={btnSecondary}>
          <LayoutDashboard className="h-4 w-4" /> Volver al Dashboard
        </Link>
        <div className="flex flex-col items-stretch gap-1 sm:items-end">
          <BlockedAction
            blockers={[
              ...open.map((cr) => ({ label: `Completar la escalera de cambios: ${cr.what || "solicitud sin título"}`, action: () => setEditing(cr) })),
              ...(project.replanning ? [{ label: "Terminar la replanificación: actualizar y aprobar las líneas base", href: "/proyecto" }] : []),
            ]}
          >
            <button type="button" className={btnPrimary} disabled={open.length > 0 || !!project.replanning} onClick={reviewChangeLog}>
              <CheckCircle2 className="h-4 w-4" /> Confirmar registro de cambios actualizado
            </button>
          </BlockedAction>
          <span className="text-xs text-kruger-dark/55">
            {open.length > 0 ? "Hay solicitudes sin resolver." : project.replanning ? "Termina la replanificación primero." : "Confírmalo en cada revisión, aunque no haya cambios nuevos."}
          </span>
        </div>
      </div>
    </div>
  );
}

function ChangeWizard({ project, initial, onExit }: { project: Project; initial: ChangeRequest; onExit: () => void }) {
  const { saveChangeRequest, saveIncident, setPmAuthorityLimit, startReplanning, setGovernanceThresholds, setBacReference } = useProject();
  const [cr, setCr] = useState<ChangeRequest>(initial);
  const [step, setStep] = useState(1);
  const [touched, setTouched] = useState(false);
  const [limit, setLimit] = useState(project.pm_authority_limit ?? { amount: "", days: "" });
  const [thr, setThr] = useState({
    tol: String(project.governance_thresholds.cost_tolerance_percentage),
    esc: String(project.governance_thresholds.cost_escalation_threshold_percentage),
  });
  const [bacRef, setBacRef] = useState(project.bac_reference ?? "");
  const gov = crGovernance(cr, project);
  const dateError = approvalDateError(cr.decision_date, { date: cr.created_at, label: "la creación de la solicitud" });
  const [finished, setFinished] = useState<null | "internal" | "done">(null);
  const set = <K extends keyof ChangeRequest>(k: K, v: ChangeRequest[K]) => setCr((x) => ({ ...x, [k]: v }));
  const setImpact = (patch: Partial<ChangeRequest["impact"]>) => setCr((x) => ({ ...x, impact: { ...x.impact, ...patch } }));
  const route = routeFor(cr, project);
  const valid = isCrStepValid(step, cr, project);
  const requesterEmail = project.stakeholders.find((s) => s.name.trim().toLowerCase() === cr.requester.trim().toLowerCase())?.email;

  if (finished)
    return (
      <div className={card}>
        <p className="flex items-center gap-2 text-sm font-semibold text-kruger-dark">
          <CheckCircle2 className="h-5 w-5 text-semaforo-verde" />
          {finished === "internal" ? "Resuelto sin modificar la línea base: no se convoca al CCB." : `Solicitud ${cr.status.toLowerCase()} y comunicada.`}
        </p>
        {finished === "internal" && <p className="mt-2 text-sm text-kruger-dark/70">Se registró como incidente resuelto internamente.</p>}
        {cr.status === "Aprobada" && cr.baselines_affected.length > 0 && (
          <p className="mt-3 flex gap-2 rounded-xl border border-semaforo-rojo/30 bg-semaforo-rojo/5 p-3 text-sm text-kruger-dark">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-semaforo-rojo" /> El proyecto retrocedió a Planificación (Replanificación) para actualizar:{" "}
            {cr.baselines_affected.map((b) => BASELINE_LABEL[b]).join(", ")}.
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/proyecto" className={btnPrimary}>
            <LayoutDashboard className="h-4 w-4" /> Volver al Dashboard
          </Link>
          <Link
            href={`/cuestionario/lecciones-aprendidas?hallazgo=${encodeURIComponent(`Cambio: ${cr.what}. Resultado: ${cr.status}.`)}`}
            className={btnSecondary}
          >
            <BookOpen className="h-4 w-4" /> Registrar lección aprendida
          </Link>
          <button type="button" className={btnSecondary} onClick={onExit}>
            Ver registro de cambios
          </button>
        </div>
      </div>
    );

  const next = () => {
    if (!valid) return setTouched(true);
    setTouched(false);
    let updated = cr;
    if (step === 4 && cr.alternative_found) {
      // La alternativa resolvió: no se convoca al CCB y se registra como incidente resuelto.
      updated = { ...cr, status: "Resuelto sin cambio de línea base", communicated: true };
      saveChangeRequest(updated);
      saveIncident(
        newIncident({
          title: `Necesidad de cambio atendida sin modificar la línea base: ${cr.what}`,
          description: cr.alternative_detail,
          severity: "Baja",
          assigned_to: project.acta?.pm_name || cr.requester,
          status: "Resuelto",
          resolution: cr.alternative_detail,
        }),
      );
      setCr(updated);
      setFinished("internal");
      return;
    }
    if (step === 4)
      updated = cr.regulatory
        ? { ...cr, alternative_found: false, alternative_justification: REGULATORY_MESSAGE, status: "Pendiente de decisión" }
        : { ...cr, status: "Pendiente de decisión" };
    if (step === 5) {
      updated = {
        ...cr,
        route: route!.route,
        status: cr.decision as ChangeRequest["status"],
        governance: gov
          ? { ...gov, escalation_mandatory: route!.escalation_mandatory }
          : { cost_deviation_pct: 0, band: "Sobre umbral de escalamiento", escalation_mandatory: true },
      };
      saveChangeRequest(updated);
      setCr(updated);
      setStep(cr.decision === "Aprobada" ? 6 : 7);
      return;
    }
    if (step === 7) {
      saveChangeRequest(cr);
      if (cr.status === "Aprobada" && cr.baselines_affected.length > 0) startReplanning(cr.id, cr.baselines_affected);
      setFinished("done");
      return;
    }
    saveChangeRequest(updated);
    setCr(updated);
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <WizardFrame
      step={step}
      total={7}
      valid={valid}
      onBack={() => (step === 1 ? onExit() : setStep(step === 7 && cr.decision !== "Aprobada" ? 5 : step - 1))}
      backLabel={step === 1 ? "Salir" : "Atrás"}
      onNext={next}
      nextLabel={step === 7 ? "Cerrar solicitud" : step === 5 ? "Registrar decisión" : "Siguiente"}
      nextIcon={step === 7 ? <Send className="h-4 w-4" /> : undefined}
    >
      <PeopleList project={project} />
      <p className="text-xs font-medium text-kruger-dark/55">{STEP_TITLES[step - 1]}</p>

      {step === 1 && (
        <>
          <StepHeading step={1} total={7} subtitle="Entender la solicitud y su origen" title="¿Qué se solicita cambiar exactamente y quién lo solicita?" />
          <Field label="Qué se solicita cambiar" htmlFor="cr-what">
            <textarea id="cr-what" rows={2} autoFocus className={inputClass} value={cr.what} onChange={(e) => set("what", e.target.value)} />
          </Field>
          <Field label="Solicitante" htmlFor="cr-req">
            <input id="cr-req" list="people" className={inputClass} value={cr.requester} onChange={(e) => set("requester", e.target.value)} />
          </Field>
          <fieldset>
            <legend className="text-sm font-medium text-kruger-dark">Tipo de cambio</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {TYPES.map((t) => (
                <label key={t} className={clsx("cursor-pointer rounded-xl border-2 px-3 py-2 text-sm font-semibold", cr.type === t ? "border-kruger-orange bg-kruger-orange-soft text-kruger-orange" : "border-kruger-gray/30 text-kruger-dark")}>
                  <input type="radio" className="sr-only" checked={cr.type === t} onChange={() => set("type", t)} />
                  {t}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-medium text-kruger-dark">¿Cómo llegó la solicitud?</legend>
            <div className="mt-2 sm:max-w-md">
              <Toggle value={cr.origin} options={["Escrito", "Verbal"]} labels={["Por escrito", "Verbal / llamada"]} onChange={(v) => set("origin", v as ChangeRequest["origin"])} />
            </div>
          </fieldset>
          {cr.origin === "Verbal" && (
            <p role="alert" className="flex gap-2 rounded-xl border border-semaforo-rojo/30 bg-semaforo-rojo/5 p-3 text-sm font-medium text-kruger-dark">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-semaforo-rojo" /> {VERBAL_MESSAGE}
            </p>
          )}
          {cr.origin === "Escrito" && (
            <DriveFilePick
              label="Solicitud escrita (documento)"
              value={cr.written_file}
              url={cr.written_file_url}
              project={project}
              phaseId={phaseOfInput(project, "solicitud-cambio")}
              onChange={(name, url) => setCr((x) => ({ ...x, written_file: name, written_file_url: url }))}
            />
          )}
          <label className="flex items-start gap-2 text-sm text-kruger-dark">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-kruger-orange" checked={cr.regulatory} onChange={(e) => set("regulatory", e.target.checked)} />
            Es un cambio por cumplimiento regulatorio (ley, norma o criterio de cumplimiento que cambió).
          </label>
          {cr.regulatory && <Hint>El cumplimiento regulatorio no se negocia, no se somete a votación del CCB ni se rechaza por falta de presupuesto: se analiza y se escala formalmente.</Hint>}
          <ErrorText show={touched && !valid}>Completa qué, quién, el tipo y adjunta la solicitud escrita.</ErrorText>
        </>
      )}

      {step === 2 && (
        <>
          <StepHeading step={2} total={7} subtitle="Evaluación de impacto integral (bloqueante)" title="Evalúa cuantitativa y cualitativamente el impacto" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="1) Alcance" htmlFor="i-scope">
              <textarea id="i-scope" rows={2} className={inputClass} value={cr.impact.scope} onChange={(e) => setImpact({ scope: e.target.value })} />
            </Field>
            <div className="space-y-2">
              <Field label="2) Cronograma (días de impacto)" htmlFor="i-days">
                <input id="i-days" type="number" min={0} className={inputClass} value={cr.impact.schedule_days} onChange={(e) => setImpact({ schedule_days: e.target.value })} />
              </Field>
              <p className="text-xs text-kruger-dark/70">¿Afecta la ruta crítica?</p>
              <Toggle value={cr.impact.critical_path === null ? "" : cr.impact.critical_path ? "Sí" : "No"} options={["Sí", "No"]} onChange={(v) => setImpact({ critical_path: v === "Sí" })} />
            </div>
            <Field label="3) Costo (USD)" htmlFor="i-cost">
              <input id="i-cost" type="number" min={0} className={inputClass} value={cr.impact.cost_amount} onChange={(e) => setImpact({ cost_amount: e.target.value })} />
            </Field>
            <Field label="4) Calidad" htmlFor="i-q">
              <input id="i-q" className={inputClass} value={cr.impact.quality} onChange={(e) => setImpact({ quality: e.target.value })} />
            </Field>
            <Field label="5) Recursos" htmlFor="i-r">
              <input id="i-r" className={inputClass} value={cr.impact.resources} onChange={(e) => setImpact({ resources: e.target.value })} />
            </Field>
            <Field label="6) Riesgos (amenazas secundarias)" htmlFor="i-risk">
              <input id="i-risk" className={inputClass} value={cr.impact.risks} onChange={(e) => setImpact({ risks: e.target.value })} />
            </Field>
            <Field label="7) Beneficios / Caso de negocio" htmlFor="i-b">
              <input id="i-b" className={inputClass} value={cr.impact.benefits} onChange={(e) => setImpact({ benefits: e.target.value })} />
            </Field>
          </div>
          {touched && !valid && (
            <p role="alert" className="rounded-xl border border-semaforo-rojo/30 bg-semaforo-rojo/5 p-3 text-sm text-kruger-dark">
              {INCOMPLETE_IMPACT_MESSAGE} Faltan: {impactDimensions(cr.impact).filter((d) => !d.ok).map((d) => d.k).join(", ")}.
            </p>
          )}
        </>
      )}

      {step === 3 && (
        <>
          <StepHeading step={3} total={7} subtitle="Conversación" title="¿Con quién conversaste (solicitante y afectados) y qué se concluyó?" />
          <Field label="Personas consultadas" htmlFor="cr-cons">
            <input id="cr-cons" autoFocus className={inputClass} value={cr.consulted} onChange={(e) => set("consulted", e.target.value)} />
          </Field>
          <Field label="Resumen de la conversación" htmlFor="cr-conv">
            <textarea id="cr-conv" rows={3} className={inputClass} value={cr.conversation} onChange={(e) => set("conversation", e.target.value)} />
          </Field>
          <ErrorText show={touched && !valid}>Registra con quién conversaste y la conclusión.</ErrorText>
        </>
      )}

      {step === 4 && (
        <>
          <StepHeading step={4} total={7} subtitle="Alternativas" title="¿Existe alguna alternativa para cumplir la necesidad sin modificar las líneas base comprometidas?" />
          {cr.regulatory ? (
            <p role="alert" className="flex gap-2 rounded-xl border border-semaforo-rojo/30 bg-semaforo-rojo/5 p-3 text-sm text-kruger-dark">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-semaforo-rojo" /> {REGULATORY_MESSAGE}
            </p>
          ) : (
          <>
          <div className="sm:max-w-sm">
            <Toggle value={cr.alternative_found === null ? "" : cr.alternative_found ? "Sí" : "No"} options={["Sí", "No"]} onChange={(v) => set("alternative_found", v === "Sí")} />
          </div>
          {cr.alternative_found === true && (
            <Field label="Detalla la solución (compresión, optimización de recursos, absorción en colchones…)" htmlFor="alt">
              <textarea id="alt" rows={3} className={inputClass} value={cr.alternative_detail} onChange={(e) => set("alternative_detail", e.target.value)} />
            </Field>
          )}
          {cr.alternative_found === false && (
            <Field label="Justificación: por qué no hay alternativa" htmlFor="alt-j">
              <textarea id="alt-j" rows={3} className={inputClass} value={cr.alternative_justification} onChange={(e) => set("alternative_justification", e.target.value)} />
            </Field>
          )}
          <ErrorText show={touched && !valid}>Responde y detalla la alternativa o la justificación.</ErrorText>
          </>
          )}
        </>
      )}

      {step === 5 && (
        <>
          <StepHeading step={5} total={7} subtitle="Umbral y decisión de gobernanza" title="¿Quién decide y cuál es la resolución?" />
          {cr.regulatory ? (
            <p className="rounded-xl border border-semaforo-rojo/30 bg-semaforo-rojo/5 p-3 text-sm text-kruger-dark">{REGULATORY_MESSAGE}</p>
          ) : (
            <div className="space-y-4 rounded-xl bg-kruger-gray-soft p-4">
              <p className="text-sm font-medium text-kruger-dark">Gobernanza del costo (% del BAC) y autoridad del PM en cronograma</p>
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <Field label="Tolerancia operativa (%)" htmlFor="thr-tol">
                  <input id="thr-tol" type="number" min={0} step="0.1" className={inputClass} value={thr.tol} onChange={(e) => setThr({ ...thr, tol: e.target.value })} />
                </Field>
                <Field label="Umbral de escalamiento (%)" htmlFor="thr-esc">
                  <input id="thr-esc" type="number" min={0} step="0.1" className={inputClass} value={thr.esc} onChange={(e) => setThr({ ...thr, esc: e.target.value })} />
                </Field>
                <button
                  type="button"
                  className={btnSecondary}
                  disabled={!(num(thr.tol) > 0) || !(num(thr.esc) > num(thr.tol))}
                  onClick={() => setGovernanceThresholds({ cost_tolerance_percentage: num(thr.tol), cost_escalation_threshold_percentage: num(thr.esc) })}
                >
                  Guardar umbrales
                </button>
              </div>
              {num(thr.esc) <= num(thr.tol) && <p className="text-xs text-semaforo-rojo">El umbral de escalamiento debe ser mayor que la tolerancia.</p>}
              {!bacFor(project) && (
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <Field label="BAC de referencia (USD)" htmlFor="bac-ref" hint="La Línea Base de Costos se cargó como archivo: ingresa su BAC para calcular el %.">
                    <input id="bac-ref" type="number" min={0} className={inputClass} value={bacRef} onChange={(e) => setBacRef(e.target.value)} />
                  </Field>
                  <button type="button" className={btnSecondary} disabled={!(num(bacRef) > 0)} onClick={() => setBacReference(bacRef)}>
                    Guardar BAC
                  </button>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <Field label="Días máximos que el PM puede aprobar" htmlFor="lim-d">
                  <input id="lim-d" type="number" min={0} className={inputClass} value={limit.days} onChange={(e) => setLimit({ ...limit, days: e.target.value })} />
                </Field>
                <button type="button" className={btnSecondary} disabled={!limit.days} onClick={() => setPmAuthorityLimit(limit)}>
                  Guardar límite
                </button>
              </div>
            </div>
          )}
          <p className="text-sm text-kruger-dark">
            Impacto: {usd(num(cr.impact.cost_amount))}
            {gov && ` (${gov.cost_deviation_pct}% del BAC · ${gov.band})`} · {cr.impact.schedule_days || 0} días
          </p>
          {gov && !cr.regulatory && <p className="text-xs text-kruger-dark/65">{BAND_GUIDANCE[gov.band]}</p>}
          {route ? (
            <>
              <p className={clsx("rounded-xl p-3 text-sm font-medium", route.route === "PM" ? "bg-semaforo-verde/10" : "bg-semaforo-ambar/15")}>
                {route.route === "PM" ? "Decide el PM" : "Expediente formal al CCB / Gobernanza (el PM no puede aprobar unilateralmente)"}: {route.reason}
              </p>
              <fieldset>
                <legend className="text-sm font-medium text-kruger-dark">Resolución {route.route === "CCB" && "del CCB"}</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {(cr.regulatory ? ["Aprobada"] : ["Aprobada", "Rechazada", "Diferida"]).map((d) => (
                    <label key={d} className={clsx("cursor-pointer rounded-xl border-2 px-3 py-2 text-center text-sm font-semibold", cr.decision === d ? "border-kruger-orange bg-kruger-orange-soft text-kruger-orange" : "border-kruger-gray/30 text-kruger-dark")}>
                      <input type="radio" className="sr-only" checked={cr.decision === d} onChange={() => set("decision", d as ChangeRequest["decision"])} />
                      {d}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={route.route === "PM" ? "Decidido por (PM)" : "Registrado por (acta del CCB)"} htmlFor="dec-by">
                  <input id="dec-by" list="people" className={inputClass} value={cr.decision_by} onChange={(e) => set("decision_by", e.target.value)} />
                </Field>
                <Field label="Fecha de la decisión" htmlFor="dec-date" error={dateError ?? undefined}>
                  <input id="dec-date" type="date" max={todayIso()} className={inputClass} value={cr.decision_date} onChange={(e) => set("decision_date", e.target.value)} />
                </Field>
              </div>
              {!cr.regulatory && gov?.band === "Sobre tolerancia" && route.route === "PM" && (
                <label className="flex items-start gap-2 text-sm text-kruger-dark">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-kruger-orange" checked={!!cr.sponsor_informed} onChange={(e) => set("sponsor_informed", e.target.checked)} />
                  Informé al Patrocinador de esta desviación fuera de la tolerancia (obligatorio)
                </label>
              )}
              <Field label={cr.decision === "Rechazada" ? "Justificación del rechazo (obligatoria)" : "Notas de la decisión"} htmlFor="dec-notes">
                <textarea id="dec-notes" rows={2} className={inputClass} value={cr.decision_notes} onChange={(e) => set("decision_notes", e.target.value)} />
              </Field>
            </>
          ) : (
            <Hint>Guarda los umbrales, el límite de días del PM y, si falta, el BAC de referencia para saber quién decide.</Hint>
          )}
          <ErrorText show={touched && !valid}>Registra la resolución, quién decide, la fecha y, si se rechaza, la justificación.</ErrorText>
        </>
      )}

      {step === 6 && (
        <>
          <StepHeading step={6} total={7} subtitle="Implementar y actualizar líneas base" title="¿Qué líneas base modifica el cambio aprobado?" />
          <div className="space-y-2">
            {(Object.keys(BASELINE_LABEL) as BaselineId[]).map((b) => {
              const on = cr.baselines_affected.includes(b);
              return (
                <label key={b} className="flex items-center gap-2 text-sm text-kruger-dark">
                  <input type="checkbox" className="h-4 w-4 accent-kruger-orange" checked={on} onChange={() => set("baselines_affected", on ? cr.baselines_affected.filter((x) => x !== b) : [...cr.baselines_affected, b])} />
                  {BASELINE_LABEL[b]}
                </label>
              );
            })}
          </div>
          {cr.regulatory && cr.baselines_affected.length === 0 && (
            <p role="alert" className="rounded-xl border border-semaforo-rojo/30 bg-semaforo-rojo/5 p-3 text-sm text-kruger-dark">
              Requisito regulatorio o legal: selecciona al menos una línea base. El ajuste es obligatorio.
            </p>
          )}
          {cr.baselines_affected.length > 0 ? (
            <p className="flex gap-2 rounded-xl border border-semaforo-ambar/40 bg-semaforo-ambar/10 p-3 text-sm text-kruger-dark">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-semaforo-ambar" /> Al cerrar la solicitud, el proyecto entrará en Replanificación: se bloquea la
              ejecución hasta actualizar y aprobar de nuevo esas líneas base.
            </p>
          ) : (
            <Hint>Sin cambios de línea base: se implementa y se actualizan los documentos del proyecto.</Hint>
          )}
        </>
      )}

      {step === 7 && (
        <>
          <StepHeading step={7} total={7} subtitle="Comunicar estado" title="Comunica la resolución al solicitante y a los afectados" />
          <p className="rounded-xl bg-kruger-gray-soft p-4 text-sm text-kruger-dark">
            Resolución: <strong>{cr.decision}</strong>
            {cr.decision_notes && ` — ${cr.decision_notes}`}
          </p>
          <a
            className={btnSecondary}
            href={`mailto:${requesterEmail ?? ""}?subject=${encodeURIComponent(`Solicitud de cambio: ${cr.decision}`)}&body=${encodeURIComponent(
              `Solicitud: ${cr.what}\nResolución: ${cr.decision}\n${cr.decision_notes}`,
            )}`}
          >
            <Mail className="h-4 w-4" /> Abrir correo de notificación
          </a>
          <label className="flex items-center gap-2 text-sm text-kruger-dark">
            <input type="checkbox" className="h-4 w-4 accent-kruger-orange" checked={cr.communicated} onChange={(e) => set("communicated", e.target.checked)} />
            El estado fue comunicado al solicitante y a los afectados
          </label>
          <ErrorText show={touched && !valid}>Confirma que se comunicó el estado.</ErrorText>
        </>
      )}
    </WizardFrame>
  );
}
