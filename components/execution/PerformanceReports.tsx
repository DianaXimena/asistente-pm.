"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Copy, Download, LayoutDashboard, Mail, Plus, Send } from "lucide-react";
import { formatDate } from "@/lib/acta";
import { approvalDateError, todayIso } from "@/lib/audit";
import { BAND_GUIDANCE, evmGovernance } from "@/lib/governance";
import {
  baselineBac,
  evm,
  isOverdue,
  progressOf,
  suggestedEv,
  suggestedPv,
  suggestedRecipients,
  trackedItems,
  type EvmResult,
  type HealthColor,
} from "@/lib/execution";
import { emv, num, riskStatement, uid, usd } from "@/lib/planning";
import { useProject } from "@/lib/store";
import type { PerformanceReport, Project } from "@/lib/types";
import { Field, StepHeading, inputClass } from "../acta/fields";
import { Toggle } from "./LessonsRegister";
import { QuestionnaireGate } from "../QuestionnaireGate";
import { btnPrimary, btnSecondary, card } from "../ui";
import { ErrorText, Hint, WizardFrame } from "../wizard";

const TOTAL = 5;
const monthName = (period: string) => {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-EC", { month: "long", year: "numeric" });
};
const lastDay = (period: string) => {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m, 0);
  return `${y}-${String(m).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const COLOR: Record<HealthColor, string> = {
  Verde: "bg-semaforo-verde text-white",
  Ámbar: "bg-semaforo-ambar text-white",
  Rojo: "bg-semaforo-rojo text-white",
};

export function PerformanceReports() {
  return <QuestionnaireGate id="informe-desempeno">{(p) => <Reports project={p} />}</QuestionnaireGate>;
}

function Reports({ project }: { project: Project }) {
  const [mode, setMode] = useState<{ kind: "list" } | { kind: "new" } | { kind: "view"; id: string }>(
    project.reports.length ? { kind: "list" } : { kind: "new" },
  );
  if (mode.kind === "new") return <ReportWizard project={project} onCancel={() => setMode({ kind: "list" })} onPublished={(id) => setMode({ kind: "view", id })} />;
  if (mode.kind === "view") {
    const r = project.reports.find((x) => x.id === mode.id);
    if (r) return <ReportView project={project} report={r} onBack={() => setMode({ kind: "list" })} />;
  }
  const sorted = [...project.reports].sort((a, b) => b.period.localeCompare(a.period));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-card">
        <p className="text-sm text-kruger-dark">
          <strong>{project.reports.length}</strong> informes publicados
        </p>
        <button type="button" className={btnPrimary} onClick={() => setMode({ kind: "new" })}>
          <Plus className="h-4 w-4" /> Nuevo informe mensual
        </button>
      </div>
      <ul className="space-y-3">
        {sorted.map((r) => {
          const h = evm(r);
          return (
            <li key={r.id}>
              <button type="button" onClick={() => setMode({ kind: "view", id: r.id })} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-kruger-gray/25 bg-white p-5 text-left shadow-card transition hover:border-kruger-orange">
                <span>
                  <span className="block text-sm font-semibold capitalize text-kruger-dark">{monthName(r.period)}</span>
                  <span className="text-xs text-kruger-dark/60">
                    CPI {h?.cpi ?? "—"} · SPI {h?.spi ?? "—"}
                  </span>
                </span>
                {h && <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", COLOR[h.color])}>{h.color}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <Link href="/" className={btnSecondary}>
        <LayoutDashboard className="h-4 w-4" /> Volver al Dashboard
      </Link>
    </div>
  );
}

function ReportWizard({ project, onCancel, onPublished }: { project: Project; onCancel: () => void; onPublished: (id: string) => void }) {
  const { publishReport } = useProject();
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const defaultPeriod = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const items = trackedItems(project);
  const reported = new Set(project.reports.flatMap((r) => r.completed_items));
  const completedNow = items.filter((i) => progressOf(project, i.id).status === "Completado").map((i) => i.id);
  const openImpediments = project.impediments.filter((i) => i.status === "Abierto").length;

  const [r, setR] = useState<PerformanceReport>(() => {
    const bac = baselineBac(project);
    return {
      id: uid("RPT"),
      period: defaultPeriod,
      cutoff_date: lastDay(defaultPeriod),
      pv: "",
      ev: "",
      ac: "",
      bac: bac ? bac.toFixed(2) : "",
      completed_items: completedNow.filter((id) => !reported.has(id)),
      blocking_issues: null,
      notes: "",
      recipients: [],
      published_at: "",
    };
  });
  const [step, setStep] = useState(1);
  const [touched, setTouched] = useState(false);
  const set = <K extends keyof PerformanceReport>(k: K, v: PerformanceReport[K]) => setR((x) => ({ ...x, [k]: v }));
  const pvHint = suggestedPv(project, r.cutoff_date);
  const evHint = suggestedEv(project, completedNow);
  const health = evm(r);
  const recips = suggestedRecipients(project, health);
  const duplicate = project.reports.some((x) => x.period === r.period);
  // Un informe solo reporta hechos ocurridos: la fecha de corte no puede ser futura.
  const cutoffError = approvalDateError(r.cutoff_date);
  const gov = evmGovernance(r, project);

  const valid =
    step === 1
      ? !!r.period && !!r.cutoff_date && !duplicate && !cutoffError
      : step === 2
        ? num(r.pv) > 0 && r.ev.trim() !== "" && num(r.ev) >= 0 && num(r.ac) > 0 && num(r.bac) > 0
        : step === 3
          ? r.blocking_issues !== null
          : true;

  const goTo = (n: number) => {
    // Al entrar a la distribución, preselecciona los destinatarios sugeridos.
    if (n === 5 && r.recipients.length === 0) set("recipients", recips.filter((x) => x.suggested).map((x) => x.stakeholder.stakeholder_id));
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
        if (step === TOTAL) {
          const published = { ...r, published_at: new Date().toISOString() };
          publishReport(published);
          onPublished(published.id);
        } else goTo(step + 1);
      }}
      nextLabel={step === TOTAL ? "Aprobar y Distribuir" : "Siguiente"}
      nextIcon={step === TOTAL ? <Send className="h-4 w-4" /> : undefined}
    >
      {step === 1 && (
        <>
          <StepHeading step={1} total={TOTAL} subtitle="Cierre de mes" title="¿Qué periodo reporta este informe?" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Periodo" htmlFor="period">
              <input
                id="period"
                type="month"
                className={inputClass}
                value={r.period}
                max={todayIso().slice(0, 7)}
                onChange={(e) =>
                  setR((x) => ({ ...x, period: e.target.value, cutoff_date: e.target.value ? (lastDay(e.target.value) > todayIso() ? todayIso() : lastDay(e.target.value)) : "" }))
                }
              />
            </Field>
            <Field label="Fecha de corte" htmlFor="cutoff" error={cutoffError ?? undefined}>
              <input id="cutoff" type="date" max={todayIso()} className={inputClass} value={r.cutoff_date} onChange={(e) => set("cutoff_date", e.target.value)} />
            </Field>
          </div>
          <ErrorText show={duplicate}>Ya existe un informe para este periodo.</ErrorText>
        </>
      )}

      {step === 2 && (
        <>
          <StepHeading step={2} total={TOTAL} subtitle="Datos financieros (3 campos)" title="¿Cuál es el valor planificado, ganado y el costo real?" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Money id="pv" label="PV · Valor Planificado" value={r.pv} onChange={(v) => set("pv", v)} suggestion={pvHint} hint="Sugerido desde las líneas base de cronograma y costos a la fecha de corte." />
            <Money id="ev" label="EV · Valor Ganado" value={r.ev} onChange={(v) => set("ev", v)} suggestion={evHint} hint="Valor del trabajo completado. Sugerido con la regla 0/100 (solo paquetes completados)." />
            <Money id="ac" label="AC · Costo Real" value={r.ac} onChange={(v) => set("ac", v)} hint="Gastos reales devengados a la fecha de corte." />
            <Money id="bac" label="BAC · Presupuesto hasta la conclusión" value={r.bac} onChange={(v) => set("bac", v)} hint="Línea Base de Costos aprobada." />
          </div>
          <ErrorText show={touched && !valid}>PV, AC y BAC deben ser mayores a 0; EV puede ser 0 o más.</ErrorText>
        </>
      )}

      {step === 3 && (
        <>
          <StepHeading step={3} total={TOTAL} subtitle="Entregables e incidentes" title="¿Qué paquetes de trabajo se completaron en el mes?" />
          {items.length === 0 ? (
            <Hint>No hay paquetes de trabajo registrados en el asistente.</Hint>
          ) : (
            <div className="flex flex-wrap gap-2">
              {items.map((i) => {
                const on = r.completed_items.includes(i.id);
                return (
                  <label key={i.id} className={clsx("cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium", on ? "border-kruger-orange bg-kruger-orange-soft text-kruger-orange" : "border-kruger-gray/40 text-kruger-dark")}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => set("completed_items", on ? r.completed_items.filter((x) => x !== i.id) : [...r.completed_items, i.id])} />
                    {i.code} {i.name}
                  </label>
                );
              })}
            </div>
          )}
          <fieldset>
            <legend className="text-sm font-medium text-kruger-dark">¿Existen incidentes bloqueantes o riesgos críticos no resueltos?</legend>
            {openImpediments > 0 && <p className="mt-1 text-xs text-kruger-dark/60">Hay {openImpediments} impedimento(s) abierto(s) en el tablero.</p>}
            <div className="mt-2 sm:max-w-sm">
              <Toggle value={r.blocking_issues === null ? "" : r.blocking_issues ? "Sí" : "No"} options={["Sí", "No"]} onChange={(v) => set("blocking_issues", v === "Sí")} />
            </div>
          </fieldset>
          <Field label="Notas para la gerencia (opcional)" htmlFor="notes">
            <textarea id="notes" rows={2} className={inputClass} value={r.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
          <ErrorText show={touched && !valid}>Responde si existen incidentes bloqueantes.</ErrorText>
        </>
      )}

      {step === 4 && health && (
        <>
          <StepHeading step={4} total={TOTAL} subtitle="Diagnóstico automático" title="Así está la salud del proyecto" />
          <HealthCards h={health} />
          <p className="rounded-xl bg-kruger-gray-soft p-4 text-sm text-kruger-dark">{health.summary}</p>
          {gov && <GovernanceNote pct={gov.cost_deviation_pct} band={gov.band} />}
          <p className={clsx("rounded-xl p-4 text-sm font-medium", health.color === "Rojo" ? "bg-semaforo-rojo/10 text-kruger-dark" : health.color === "Ámbar" ? "bg-semaforo-ambar/15 text-kruger-dark" : "bg-semaforo-verde/10 text-kruger-dark")}>
            {health.message}
          </p>
        </>
      )}

      {step === 5 && (
        <>
          <StepHeading step={5} total={TOTAL} subtitle="Distribución" title="¿A quién se envía el informe?" />
          <Hint>Destinatarios sugeridos según la Matriz de Comunicaciones (Poder vs. Interés).</Hint>
          {recips.length === 0 && <Hint>No hay interesados registrados en el asistente.</Hint>}
          <ul className="space-y-2">
            {recips.map(({ stakeholder: s, method, reason }) => {
              const isPull = method.startsWith("Pull") || method === "—";
              const on = r.recipients.includes(s.stakeholder_id);
              return (
                <li key={s.stakeholder_id} className="flex items-start gap-3 rounded-xl bg-kruger-gray-soft p-3">
                  <input
                    type="checkbox"
                    aria-label={`Enviar a ${s.name}`}
                    disabled={isPull}
                    className="mt-1 h-4 w-4 accent-kruger-orange"
                    checked={on}
                    onChange={() => set("recipients", on ? r.recipients.filter((x) => x !== s.stakeholder_id) : [...r.recipients, s.stakeholder_id])}
                  />
                  <span className="min-w-0 text-sm">
                    <span className="font-medium text-kruger-dark">{s.name}</span> <span className="text-kruger-dark/60">· {s.role}</span>
                    <span className="block text-xs text-kruger-dark/60">
                      {method} — {reason}
                      {!isPull && !s.email && " · sin correo registrado"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </WizardFrame>
  );
}

/** Hallazgo 3: banda de gobernanza del costo (tolerancia vs. umbral de escalamiento). */
function GovernanceNote({ pct, band }: { pct: number; band: keyof typeof BAND_GUIDANCE }) {
  return (
    <p
      className={clsx(
        "rounded-xl p-3 text-sm text-kruger-dark",
        band === "Sobre umbral de escalamiento" ? "bg-semaforo-rojo/10" : band === "Sobre tolerancia" ? "bg-semaforo-ambar/15" : "bg-semaforo-verde/10",
      )}
    >
      <strong>Desviación de costo (CV%): {pct}% · {band}.</strong> {BAND_GUIDANCE[band]}
    </p>
  );
}

function Money({ id, label, value, onChange, suggestion, hint }: { id: string; label: string; value: string; onChange: (v: string) => void; suggestion?: number | null; hint?: string }) {
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <div className="flex">
        <span className="flex items-center rounded-l-xl border border-r-0 border-kruger-gray/40 bg-kruger-gray-soft px-3 text-xs font-medium text-kruger-dark/70">USD</span>
        <input id={id} type="number" min={0} step="0.01" className={clsx(inputClass, "rounded-l-none")} value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
      {suggestion != null && (
        <button type="button" onClick={() => onChange(suggestion.toFixed(2))} className="text-xs font-medium text-kruger-orange hover:underline">
          Usar sugerido: {usd(suggestion)}
        </button>
      )}
    </Field>
  );
}

export function HealthCards({ h }: { h: EvmResult }) {
  const tile = (k: string, v: string, color?: HealthColor) => (
    <div className="rounded-xl border border-kruger-gray/25 p-4">
      <p className="text-xs text-kruger-dark/60">{k}</p>
      <p className="mt-1 flex items-center gap-2 text-xl font-semibold tabular-nums text-kruger-dark">
        {color && <span className={clsx("h-2.5 w-2.5 rounded-full", color === "Verde" ? "bg-semaforo-verde" : color === "Ámbar" ? "bg-semaforo-ambar" : "bg-semaforo-rojo")} />}
        {v}
      </p>
    </div>
  );
  const c = (x: number): HealthColor => (x < 0.9 ? "Rojo" : x < 1 ? "Ámbar" : "Verde");
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tile("CPI = EV / AC", h.cpi.toFixed(2), c(h.cpi))}
      {tile("SPI = EV / PV", h.spi.toFixed(2), c(h.spi))}
      {tile("EAC = BAC / CPI", Number.isFinite(h.eac) ? usd(h.eac) : "—")}
      {tile("VAC = BAC − EAC", Number.isFinite(h.vac) ? usd(h.vac) : "—")}
    </div>
  );
}

/** Informe ejecutivo de 1 página: Encabezado, Semáforo Financiero, Logros del Mes, Próximos Pasos y Alertas. */
function ReportView({ project, report: r, onBack }: { project: Project; report: PerformanceReport; onBack: () => void }) {
  const h = evm(r);
  const items = trackedItems(project);
  const done = items.filter((i) => r.completed_items.includes(i.id));
  const topRisks = [...project.risks].filter((x) => x.type === "Amenaza").sort((a, b) => emv(b) - emv(a)).slice(0, 3);
  const openImp = project.impediments.filter((i) => i.status === "Abierto");
  const push = project.stakeholders.filter((s) => r.recipients.includes(s.stakeholder_id) && s.email);
  const subject = `Informe de Desempeño · ${project.project_name} · ${monthName(r.period)}`;
  const body = `${h?.summary ?? ""}\n\nEstado: ${h?.color ?? "—"}. ${h?.message ?? ""}`;
  const mailto = `mailto:${push.map((s) => s.email).join(",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-6">
      <article className={clsx(card, "print:border-0 print:shadow-none")}>
        <header className="flex flex-wrap items-end justify-between gap-3 border-b-4 border-kruger-orange pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-kruger-orange">Informe de Desempeño</p>
            <h2 className="mt-1 text-xl font-semibold text-kruger-dark">{project.project_name}</h2>
            <p className="text-xs text-kruger-dark/60">
              {project.client_name} · Corte: {formatDate(r.cutoff_date)} · PM: {project.acta?.pm_name ?? "—"} · Fase: Ejecución
            </p>
          </div>
          {h && <span className={clsx("rounded-full px-3 py-1 text-sm font-semibold", COLOR[h.color])}>{h.color}</span>}
        </header>
        {h && (
          <section className="mt-5 space-y-3">
            <h3 className="text-sm font-semibold text-kruger-dark">Semáforo financiero</h3>
            <HealthCards h={h} />
            <p className="text-sm text-kruger-dark/80">{h.summary}</p>
            {evmGovernance(r, project) && <GovernanceNote pct={evmGovernance(r, project)!.cost_deviation_pct} band={evmGovernance(r, project)!.band} />}
          </section>
        )}
        <section className="mt-5">
          <h3 className="text-sm font-semibold text-kruger-dark">Logros del mes</h3>
          <p className="mt-1 text-xs text-kruger-dark/60">
            {done.length} {done.length === 1 ? "paquete completado" : "paquetes completados"} en el periodo · {items.filter((i) => progressOf(project, i.id).status === "Completado").length} de {items.length} acumulados
          </p>
          <ul className="mt-2 space-y-1 text-sm text-kruger-dark">
            {done.map((i) => (
              <li key={i.id}>✓ {i.code} {i.name}</li>
            ))}
            {done.length === 0 && <li className="text-kruger-dark/60">Sin paquetes completados en el periodo.</li>}
          </ul>
        </section>
        <section className="mt-5">
          <h3 className="text-sm font-semibold text-kruger-dark">Próximos pasos y alertas</h3>
          <ul className="mt-2 space-y-1 text-sm text-kruger-dark">
            {topRisks.map((x) => (
              <li key={x.risk_id}>
                Riesgo: {riskStatement(x)} <span className="text-kruger-dark/60">· {x.owner} · EMV {usd(emv(x))}</span>
              </li>
            ))}
            {openImp.map((i) => (
              <li key={i.id}>
                Impedimento: {i.description} <span className={clsx("text-kruger-dark/60", isOverdue(i) && "text-semaforo-rojo")}>· {i.owner} · {formatDate(i.due_date)}</span>
              </li>
            ))}
            {r.blocking_issues && <li>Hay incidentes bloqueantes o riesgos críticos no resueltos que requieren decisión del Comité.</li>}
            {r.notes && <li>{r.notes}</li>}
            {topRisks.length + openImp.length === 0 && !r.blocking_issues && !r.notes && <li className="text-kruger-dark/60">Sin alertas abiertas.</li>}
          </ul>
        </section>
      </article>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap print:hidden">
        <a href={mailto} className={clsx(btnPrimary, push.length === 0 && "pointer-events-none bg-kruger-gray")} aria-disabled={push.length === 0}>
          <Mail className="h-4 w-4" /> Abrir correo (Push · {push.length})
        </a>
        <button type="button" onClick={() => window.print()} className={btnSecondary}>
          <Download className="h-4 w-4" /> Descargar PDF
        </button>
        <button
          type="button"
          className={btnSecondary}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(location.origin);
              setCopied(true);
            } catch {
              /* ignorar */
            }
          }}
        >
          <Copy className="h-4 w-4" /> {copied ? "Enlace copiado" : "Copiar enlace para el equipo (Pull)"}
        </button>
        <button type="button" onClick={onBack} className={btnSecondary}>
          Ver todos los informes
        </button>
      </div>
    </div>
  );
}
