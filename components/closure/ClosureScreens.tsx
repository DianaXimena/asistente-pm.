"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { CheckCircle2, FileUp, LayoutDashboard, Lock, ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/acta";
import { ORG_TAGS, closureOf, deliverableRows, isAcceptanceComplete, isAdminClosed, isContractClosed } from "@/lib/closure";
import { baselineBac, latestReport } from "@/lib/execution";
import { num, uid, usd } from "@/lib/planning";
import { useProject } from "@/lib/store";
import type { Closure, Contract, DeliverableAcceptance, Project } from "@/lib/types";
import { Field, StepHeading, inputClass } from "../acta/fields";
import { Toggle } from "../execution/LessonsRegister";
import { PeopleList } from "../planning/PeopleList";
import { AddBtn, Done, RemoveBtn } from "../planning/ScopeWizard";
import { QuestionnaireGate } from "../QuestionnaireGate";
import { btnPrimary, btnSecondary, card } from "../ui";
import { ErrorText, Hint, WizardFrame } from "../wizard";

/* ======================= Aceptación formal del cliente ======================= */

export function AcceptanceScreen() {
  return <QuestionnaireGate id="aceptacion-entregables">{(p) => <Acceptance project={p} />}</QuestionnaireGate>;
}

function Acceptance({ project }: { project: Project }) {
  const rows = deliverableRows(project);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-6">
      <PeopleList project={project} />
      <Hint>
        Controlar la Calidad (inspección interna) → Entregable verificado → Validar el Alcance (inspección con el cliente) → Entregable aceptado. Nunca se presenta
        al cliente un entregable sin verificación interna previa.
      </Hint>
      {rows.length === 0 && <div className={clsx(card, "text-sm text-kruger-dark/70")}>No hay entregables registrados en el asistente.</div>}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className={card}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-kruger-dark">{r.name}</p>
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  r.accepted ? "bg-semaforo-verde/10 text-semaforo-verde" : r.verified ? "bg-semaforo-ambar/15 text-kruger-dark" : "bg-kruger-gray-soft text-kruger-dark/70",
                )}
              >
                {r.accepted ? "Aceptado por el cliente" : r.verified ? "Verificado · pendiente de aceptación" : "Pendiente de verificación de calidad"}
              </span>
            </div>
            {!r.verified && (
              <p className="mt-3 flex items-center gap-2 text-sm text-kruger-dark/70">
                <Lock className="h-4 w-4" /> Completa y verifica (QC) todos sus paquetes en el{" "}
                <Link href="/ejecucion" className="text-kruger-orange hover:underline">
                  Tablero de Ejecución
                </Link>
                .
              </p>
            )}
            {r.accepted && r.acceptance && (
              <p className="mt-2 text-xs text-kruger-dark/65">
                Aceptado por {r.acceptance.accepted_by} el {formatDate(r.acceptance.acceptance_date)} · Acta: {r.acceptance.acceptance_file} · Operaciones: {r.acceptance.ops_owner}
              </p>
            )}
            {r.verified && open !== r.id && (
              <button type="button" className={clsx(btnSecondary, "mt-3")} onClick={() => setOpen(r.id)}>
                {r.accepted ? "Editar aceptación" : "Registrar aceptación y transición"}
              </button>
            )}
            {open === r.id && <AcceptanceWizard project={project} id={r.id} initial={r.acceptance} onClose={() => setOpen(null)} />}
          </li>
        ))}
      </ul>
      <Link href="/" className={btnSecondary}>
        <LayoutDashboard className="h-4 w-4" /> Volver al Dashboard
      </Link>
    </div>
  );
}

const EMPTY_ACCEPT: DeliverableAcceptance = { accepted_by: "", acceptance_date: "", acceptance_file: "", ops_owner: "", maintenance_plan: "", benefit_metrics: "" };

function AcceptanceWizard({ project, id, initial, onClose }: { project: Project; id: string; initial?: DeliverableAcceptance; onClose: () => void }) {
  const { saveClosure } = useProject();
  const [a, setA] = useState<DeliverableAcceptance>(initial ?? EMPTY_ACCEPT);
  const [step, setStep] = useState(1);
  const [touched, setTouched] = useState(false);
  const valid =
    step === 1 ? !!(a.accepted_by.trim() && a.acceptance_date && a.acceptance_file) : step === 2 ? a.ops_owner.trim().length > 0 : isAcceptanceComplete(a);
  return (
    <div className="mt-4">
      <WizardFrame
        step={step}
        total={3}
        valid={valid}
        onBack={() => (step === 1 ? onClose() : setStep(step - 1))}
        backLabel={step === 1 ? "Cancelar" : "Atrás"}
        onNext={() => {
          if (!valid) return setTouched(true);
          setTouched(false);
          if (step === 3) {
            const c = closureOf(project);
            saveClosure({ acceptance: { ...c.acceptance, [id]: a } });
            onClose();
          } else setStep(step + 1);
        }}
        nextLabel={step === 3 ? "Registrar aceptación" : "Siguiente"}
        nextIcon={step === 3 ? <ShieldCheck className="h-4 w-4" /> : undefined}
      >
        {step === 1 && (
          <>
            <StepHeading step={1} total={3} subtitle="Acta de aceptación" title="¿Quién del cliente aceptó formalmente el entregable?" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Aceptado por (cliente / usuario final)" htmlFor="acc-by">
                <input id="acc-by" list="people" className={inputClass} value={a.accepted_by} onChange={(e) => setA({ ...a, accepted_by: e.target.value })} />
              </Field>
              <Field label="Fecha de aceptación" htmlFor="acc-date">
                <input id="acc-date" type="date" className={inputClass} value={a.acceptance_date} onChange={(e) => setA({ ...a, acceptance_date: e.target.value })} />
              </Field>
            </div>
            <FilePick label="Acta de aceptación firmada" value={a.acceptance_file} onChange={(v) => setA({ ...a, acceptance_file: v })} />
            <ErrorText show={touched && !valid}>Registra quién aceptó, la fecha y adjunta el acta firmada.</ErrorText>
          </>
        )}
        {step === 2 && (
          <>
            <StepHeading step={2} total={3} subtitle="Receptor operativo" title="¿Quién en operaciones o soporte asume la titularidad del entregable?" />
            <Field label="Responsable en operaciones / soporte" htmlFor="ops">
              <input id="ops" list="people" autoFocus className={inputClass} value={a.ops_owner} onChange={(e) => setA({ ...a, ops_owner: e.target.value })} />
            </Field>
            <ErrorText show={touched && !valid}>Indica el receptor operativo.</ErrorText>
          </>
        )}
        {step === 3 && (
          <>
            <StepHeading step={3} total={3} subtitle="Mantenimiento y beneficios" title="¿Cómo se mantendrá y qué valor se seguirá midiendo tras el cierre?" />
            <Field label="Plan de mantenimiento" htmlFor="maint">
              <textarea id="maint" rows={2} autoFocus className={inputClass} value={a.maintenance_plan} onChange={(e) => setA({ ...a, maintenance_plan: e.target.value })} />
            </Field>
            <Field label="Métricas de beneficio a seguir midiendo" htmlFor="bm">
              <textarea id="bm" rows={2} className={inputClass} value={a.benefit_metrics} onChange={(e) => setA({ ...a, benefit_metrics: e.target.value })} />
            </Field>
            <ErrorText show={touched && !valid}>Completa el plan de mantenimiento y las métricas.</ErrorText>
          </>
        )}
      </WizardFrame>
    </div>
  );
}

/* ======================= Cierre de contratos y administrativo ======================= */

export function ContractsScreen() {
  return <QuestionnaireGate id="cierre-contratos">{(p) => <Contracts project={p} />}</QuestionnaireGate>;
}

const newContract = (partial: Partial<Contract> = {}): Contract => ({
  id: uid("CTR"),
  name: "",
  supplier: "",
  deliverables_ok: false,
  final_payment: false,
  audit_done: false,
  open_claims: null,
  closure_file: "",
  ...partial,
});

function Contracts({ project }: { project: Project }) {
  const { saveClosure } = useProject();
  const [c, setC] = useState<Closure>(() => {
    const base = closureOf(project);
    if (base.contracts.length || base.contracts_confirmed) return base;
    // Sugerencia: un contrato por cada proveedor externo de la Asignación de Recursos.
    const suppliers = [...new Set((project.resources?.members ?? []).filter((m) => m.kind === "Externo").map((m) => m.organization))];
    const last = latestReport(project);
    return { ...base, contracts: suppliers.map((s) => newContract({ name: `Contrato con ${s}`, supplier: s })), final_cost: base.final_cost || last?.ac || "" };
  });
  const [step, setStep] = useState(1);
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState(false);
  const setK = (i: number, patch: Partial<Contract>) => setC((x) => ({ ...x, contracts: x.contracts.map((k, j) => (j === i ? { ...k, ...patch } : k)) }));
  const bac = baselineBac(project);
  const valid = step === 1 ? c.contracts_confirmed && c.contracts.every(isContractClosed) : step === 2 ? num(c.final_cost) > 0 && c.docs_archived : isAdminClosed(c);

  if (done) return <Done title="Contratos y cierre administrativo completados" />;

  return (
    <WizardFrame
      step={step}
      total={3}
      valid={valid}
      onBack={() => (step === 1 ? history.back() : setStep(step - 1))}
      backLabel={step === 1 ? "Salir" : "Atrás"}
      onNext={() => {
        if (!valid) return setTouched(true);
        setTouched(false);
        saveClosure({ contracts: c.contracts, contracts_confirmed: c.contracts_confirmed, final_cost: c.final_cost, docs_archived: c.docs_archived, resources_released: c.resources_released });
        if (step === 3) setDone(true);
        else setStep(step + 1);
      }}
      nextLabel={step === 3 ? "Cerrar contratos y administración" : "Siguiente"}
      nextIcon={step === 3 ? <ShieldCheck className="h-4 w-4" /> : undefined}
    >
      {step === 1 && (
        <>
          <StepHeading step={1} total={3} subtitle="Cierre de adquisiciones" title="¿Están cerrados todos los contratos del proyecto?" />
          <ul className="space-y-3">
            {c.contracts.map((k, i) => (
              <li key={k.id} className={clsx("space-y-3 rounded-xl p-4", touched && !isContractClosed(k) ? "bg-semaforo-rojo/5" : "bg-kruger-gray-soft")}>
                <div className="flex gap-2">
                  <input aria-label={`Contrato ${i + 1}`} className={inputClass} placeholder="Contrato" value={k.name} onChange={(e) => setK(i, { name: e.target.value })} />
                  <input aria-label={`Proveedor ${i + 1}`} className={inputClass} placeholder="Proveedor" value={k.supplier} onChange={(e) => setK(i, { supplier: e.target.value })} />
                  <RemoveBtn label={`Eliminar contrato ${i + 1}`} onClick={() => setC((x) => ({ ...x, contracts: x.contracts.filter((_, j) => j !== i) }))} />
                </div>
                <div className="grid gap-2 text-sm text-kruger-dark sm:grid-cols-3">
                  <Check label="Entregas recibidas conformes" value={k.deliverables_ok} onChange={(v) => setK(i, { deliverables_ok: v })} />
                  <Check label="Pago final realizado" value={k.final_payment} onChange={(v) => setK(i, { final_payment: v })} />
                  <Check label="Auditoría de la adquisición" value={k.audit_done} onChange={(v) => setK(i, { audit_done: v })} />
                </div>
                <div>
                  <p className="text-xs text-kruger-dark/70">¿Hay reclamaciones abiertas?</p>
                  <div className="mt-1 sm:max-w-xs">
                    <Toggle value={k.open_claims === null ? "" : k.open_claims ? "Sí" : "No"} options={["Sí", "No"]} onChange={(v) => setK(i, { open_claims: v === "Sí" })} />
                  </div>
                  {k.open_claims && <p className="mt-1 text-xs text-semaforo-rojo">Resuelve las reclamaciones (negociación como primera opción) antes de cerrar el contrato.</p>}
                </div>
                <FilePick label="Constancia de cierre formal del contrato" value={k.closure_file} onChange={(v) => setK(i, { closure_file: v })} />
              </li>
            ))}
          </ul>
          <AddBtn onClick={() => setC((x) => ({ ...x, contracts: [...x.contracts, newContract()] }))}>Agregar contrato</AddBtn>
          <Check label="Confirmo que la lista incluye todos los contratos del proyecto (o que no hubo contratos)" value={c.contracts_confirmed} onChange={(v) => setC((x) => ({ ...x, contracts_confirmed: v }))} />
          <ErrorText show={touched && !valid}>Cada contrato necesita entregas conformes, pago final, auditoría, sin reclamaciones y constancia de cierre; confirma la lista.</ErrorText>
        </>
      )}
      {step === 2 && (
        <>
          <StepHeading step={2} total={3} subtitle="Cierre financiero" title="¿Cuál es el costo final real del proyecto?" />
          <Field label="Costo final real (USD)" htmlFor="final" hint="Sugerido desde el AC del último informe de desempeño.">
            <input id="final" type="number" min={0} className={clsx(inputClass, "sm:max-w-xs")} value={c.final_cost} onChange={(e) => setC((x) => ({ ...x, final_cost: e.target.value }))} />
          </Field>
          {bac && num(c.final_cost) > 0 && (
            <p className={clsx("rounded-xl p-3 text-sm", num(c.final_cost) > bac ? "bg-semaforo-rojo/5" : "bg-semaforo-verde/10")}>
              BAC: {usd(bac)} · Variación al cierre: <strong>{usd(bac - num(c.final_cost))}</strong>
            </p>
          )}
          <Check label="Documentación del proyecto archivada en el repositorio" value={c.docs_archived} onChange={(v) => setC((x) => ({ ...x, docs_archived: v }))} />
          <ErrorText show={touched && !valid}>Ingresa el costo final y confirma el archivo de la documentación.</ErrorText>
        </>
      )}
      {step === 3 && (
        <>
          <StepHeading step={3} total={3} subtitle="Liberación" title="¿Se liberaron los recursos del proyecto?" />
          <Hint>Libera al equipo y los recursos físicos, actualiza sus asignaciones y reconoce su trabajo.</Hint>
          <Check label="Recursos del proyecto liberados" value={c.resources_released} onChange={(v) => setC((x) => ({ ...x, resources_released: v }))} />
          <ErrorText show={touched && !valid}>Confirma la liberación de recursos.</ErrorText>
        </>
      )}
    </WizardFrame>
  );
}

/* ======================= Archivo de lecciones aprendidas (OPA) ======================= */

export function LessonsArchiveScreen() {
  return <QuestionnaireGate id="archivo-lecciones">{(p) => <Archive project={p} />}</QuestionnaireGate>;
}

function Archive({ project }: { project: Project }) {
  const { saveClosure } = useProject();
  const [c, setC] = useState<Closure>(() => closureOf(project));
  const [step, setStep] = useState(1);
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState(false);
  const valid =
    step === 1
      ? project.lessons.every((l) => (c.lesson_tags[l.id] ?? "").trim())
      : step === 2
        ? c.opa_folder.trim().length > 0
        : !!c.retrospective_date && c.retrospective_participants.trim().length > 0;

  if (done) return <Done title="Lecciones archivadas como activo de la organización (OPA)" />;

  return (
    <WizardFrame
      step={step}
      total={3}
      valid={valid}
      onBack={() => (step === 1 ? history.back() : setStep(step - 1))}
      backLabel={step === 1 ? "Salir" : "Atrás"}
      onNext={() => {
        if (!valid) return setTouched(true);
        setTouched(false);
        const patch = { lesson_tags: c.lesson_tags, opa_folder: c.opa_folder, retrospective_date: c.retrospective_date, retrospective_participants: c.retrospective_participants };
        if (step === 3) {
          saveClosure({ ...patch, lessons_archived: true });
          setDone(true);
        } else {
          saveClosure(patch);
          setStep(step + 1);
        }
      }}
      nextLabel={step === 3 ? "Archivar lecciones" : "Siguiente"}
      nextIcon={step === 3 ? <ShieldCheck className="h-4 w-4" /> : undefined}
    >
      <datalist id="org-tags">
        {ORG_TAGS.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      {step === 1 && (
        <>
          <StepHeading step={1} total={3} subtitle="Clasificar" title="Asigna una etiqueta organizacional a cada lección" />
          {project.lessons.length === 0 && <Hint>No hay lecciones registradas en el asistente (el registro pudo cargarse como archivo).</Hint>}
          <ul className="space-y-2">
            {project.lessons.map((l) => (
              <li key={l.id} className="grid gap-2 rounded-xl bg-kruger-gray-soft p-3 sm:grid-cols-[1fr_14rem] sm:items-center">
                <span className="text-sm text-kruger-dark">
                  {l.situation} <span className="text-xs text-kruger-dark/55">· {l.recommendation}</span>
                </span>
                <input
                  aria-label={`Etiqueta de ${l.situation}`}
                  list="org-tags"
                  className={inputClass}
                  placeholder="Etiqueta"
                  value={c.lesson_tags[l.id] ?? ""}
                  onChange={(e) => setC((x) => ({ ...x, lesson_tags: { ...x.lesson_tags, [l.id]: e.target.value } }))}
                />
              </li>
            ))}
          </ul>
          <ErrorText show={touched && !valid}>Etiqueta todas las lecciones.</ErrorText>
        </>
      )}
      {step === 2 && (
        <>
          <StepHeading step={2} total={3} subtitle="Conocimiento explícito" title="¿Dónde se publica el repositorio de lecciones (OPA)?" />
          <Field label="Carpeta o ruta del repositorio organizacional" htmlFor="opa" hint="Ejemplo de formato: OPAs/2026/Nombre_de_la_practica">
            <input id="opa" autoFocus className={inputClass} value={c.opa_folder} onChange={(e) => setC((x) => ({ ...x, opa_folder: e.target.value }))} />
          </Field>
          <ErrorText show={touched && !valid}>Indica dónde se publica.</ErrorText>
        </>
      )}
      {step === 3 && (
        <>
          <StepHeading step={3} total={3} subtitle="Conocimiento tácito" title="¿Cuándo es la retrospectiva o sesión de transferencia entre personas?" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha de la sesión" htmlFor="retro">
              <input id="retro" type="date" className={inputClass} value={c.retrospective_date} onChange={(e) => setC((x) => ({ ...x, retrospective_date: e.target.value }))} />
            </Field>
            <Field label="Participantes" htmlFor="retro-p">
              <input id="retro-p" className={inputClass} value={c.retrospective_participants} onChange={(e) => setC((x) => ({ ...x, retrospective_participants: e.target.value }))} />
            </Field>
          </div>
          <ErrorText show={touched && !valid}>Indica fecha y participantes.</ErrorText>
        </>
      )}
    </WizardFrame>
  );
}

/* ======================= Utilidades ======================= */

function Check({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 text-sm text-kruger-dark">
      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-kruger-orange" checked={value} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function FilePick({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-kruger-gray/50 bg-white p-3 text-sm text-kruger-dark hover:border-kruger-orange">
      <FileUp className="h-5 w-5 shrink-0 text-kruger-orange" />
      <span className="min-w-0 break-all">{value || label}</span>
      {value && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-semaforo-verde" />}
      <input type="file" className="sr-only" aria-label={label} onChange={(e) => onChange(e.target.files?.[0]?.name ?? "")} />
    </label>
  );
}
