"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, FilePlus2, LayoutDashboard, Plus, Zap } from "lucide-react";
import { formatDate } from "@/lib/acta";
import { contingencyStatus, incidentFromRisk, isIncidentValid, newChangeRequest, newIncident } from "@/lib/control";
import { num, riskStatement, usd } from "@/lib/planning";
import { useProject } from "@/lib/store";
import type { Incident, Project, Risk, Severity } from "@/lib/types";
import { Field, inputClass } from "../acta/fields";
import { Toggle } from "../execution/LessonsRegister";
import { PeopleList } from "../planning/PeopleList";
import { QuestionnaireGate } from "../QuestionnaireGate";
import { btnPrimary, btnSecondary, card } from "../ui";
import { ErrorText, Hint } from "../wizard";

const SEVERITIES: Severity[] = ["Crítica", "Alta", "Media", "Baja"];

export function IncidentRegister() {
  return <QuestionnaireGate id="registro-incidentes">{(p) => <Register project={p} />}</QuestionnaireGate>;
}

function Register({ project }: { project: Project }) {
  const { saveIncident, reviewIncidentRegister, saveChangeRequest } = useProject();
  const [draft, setDraft] = useState<Incident | null>(null);
  const [converting, setConverting] = useState<Risk | null>(null);
  const [touched, setTouched] = useState(false);
  const cont = contingencyStatus(project);
  const converted = new Set(project.incidents.map((i) => i.derived_from_risk_id).filter(Boolean));
  const openRisks = project.risks.filter((r) => !converted.has(r.risk_id));
  const allAttended = project.incidents.every((i) => i.status !== "Abierto");

  /** Impacta línea base: crea automáticamente la Solicitud de Cambio (acción correctiva). */
  const raiseChange = (i: Incident) => {
    const cr = newChangeRequest({
      what: `Acción correctiva por el incidente "${i.title}"`,
      requester: i.assigned_to,
      type: "Acción Correctiva",
      derived_from_incident_id: i.id,
    });
    saveChangeRequest(cr);
    saveIncident({ ...i, baseline_impacted: true, change_request_id: cr.id, status: i.status === "Abierto" ? "En resolución" : i.status });
  };

  return (
    <div className="space-y-6">
      <PeopleList project={project} />
      <section className={clsx(card, "grid gap-4 sm:grid-cols-3")}>
        <Stat k="Reserva de contingencia" v={usd(cont.reserve)} />
        <Stat k="Usada en incidentes" v={usd(cont.used)} />
        <Stat k="Disponible" v={usd(cont.available)} danger={cont.available < 0} />
      </section>

      {openRisks.length > 0 && !converting && (
        <section className={card}>
          <h2 className="text-base font-semibold text-kruger-dark">Riesgos registrados</h2>
          <p className="mt-1 text-sm text-kruger-dark/60">Un riesgo es incertidumbre futura; si ocurre, transiciona a incidente (hecho presente).</p>
          <ul className="mt-4 space-y-2">
            {openRisks.map((r) => (
              <li key={r.risk_id} className="flex flex-col gap-2 rounded-xl bg-kruger-gray-soft p-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-kruger-dark">{riskStatement(r)}</span>
                <button type="button" className={clsx(btnSecondary, "shrink-0")} onClick={() => setConverting(r)}>
                  <Zap className="h-4 w-4 text-kruger-orange" /> Marcar como Ocurrido
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {converting && (
        <ConvertRisk
          risk={converting}
          onCancel={() => setConverting(null)}
          onDone={(inc, sufficient) => {
            saveIncident(inc);
            if (!sufficient) raiseChange(inc);
            setConverting(null);
          }}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-kruger-dark">Incidentes ({project.incidents.length})</h2>
        {!draft && (
          <button type="button" className={btnPrimary} onClick={() => setDraft(newIncident())}>
            <Plus className="h-4 w-4" /> Registrar incidente
          </button>
        )}
      </div>

      {draft && (
        <div className="space-y-4 rounded-2xl border-2 border-kruger-orange/40 bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Título" htmlFor="inc-title">
              <input id="inc-title" autoFocus className={inputClass} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </Field>
            <Field label="Responsable (obligatorio)" htmlFor="inc-owner">
              <input id="inc-owner" list="people" className={inputClass} value={draft.assigned_to} onChange={(e) => setDraft({ ...draft, assigned_to: e.target.value })} />
            </Field>
          </div>
          <Field label="Descripción del hecho" htmlFor="inc-desc">
            <textarea id="inc-desc" rows={2} className={inputClass} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </Field>
          <fieldset>
            <legend className="text-sm font-medium text-kruger-dark">Severidad</legend>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SEVERITIES.map((sv) => (
                <label key={sv} className={clsx("cursor-pointer rounded-xl border-2 px-3 py-2 text-center text-sm font-semibold", draft.severity === sv ? "border-kruger-orange bg-kruger-orange-soft text-kruger-orange" : "border-kruger-gray/30 text-kruger-dark")}>
                  <input type="radio" className="sr-only" checked={draft.severity === sv} onChange={() => setDraft({ ...draft, severity: sv })} />
                  {sv}
                </label>
              ))}
            </div>
          </fieldset>
          <ErrorText show={touched && !isIncidentValid(draft)}>Completa título, descripción, severidad y responsable.</ErrorText>
          <div className="flex gap-2">
            <button
              type="button"
              className={btnPrimary}
              onClick={() => {
                if (!isIncidentValid(draft)) return setTouched(true);
                saveIncident(draft);
                setDraft(null);
                setTouched(false);
              }}
            >
              Guardar incidente
            </button>
            <button type="button" className={btnSecondary} onClick={() => setDraft(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <ul className="space-y-3">
        {project.incidents.map((i) => (
          <IncidentCard key={i.id} incident={i} onRaiseChange={() => raiseChange(i)} />
        ))}
      </ul>

      <div className="flex flex-col-reverse justify-between gap-3 border-t border-kruger-gray/25 pt-6 sm:flex-row sm:items-center">
        <Link href="/proyecto" className={btnSecondary}>
          <LayoutDashboard className="h-4 w-4" /> Volver al Dashboard
        </Link>
        <div className="flex flex-col items-stretch gap-1 sm:items-end">
          <button type="button" className={btnPrimary} disabled={!allAttended} onClick={reviewIncidentRegister}>
            <CheckCircle2 className="h-4 w-4" /> Confirmar registro actualizado
          </button>
          <span className="text-xs text-kruger-dark/55">
            {allAttended ? "Confírmalo en cada revisión, aunque no haya incidentes nuevos." : "Todos los incidentes deben estar en resolución o resueltos."}
          </span>
        </div>
      </div>
    </div>
  );
}

function ConvertRisk({ risk, onCancel, onDone }: { risk: Risk; onCancel: () => void; onDone: (i: Incident, sufficient: boolean) => void }) {
  const [inc, setInc] = useState<Incident>(() => incidentFromRisk(risk));
  const [sufficient, setSufficient] = useState<"" | "Sí" | "No">("");
  const valid = !!inc.severity && !!sufficient && (sufficient === "No" || inc.executed_action.trim().length > 0);
  return (
    <section className="space-y-4 rounded-2xl border-2 border-kruger-orange/40 bg-white p-6">
      <h2 className="flex items-center gap-2 text-base font-semibold text-kruger-dark">
        <Zap className="h-4 w-4 text-kruger-orange" /> Convertir riesgo en incidente
      </h2>
      <p className="text-sm text-kruger-dark/75">{inc.description}</p>
      <fieldset>
        <legend className="text-sm font-medium text-kruger-dark">Severidad</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SEVERITIES.map((sv) => (
            <label key={sv} className={clsx("cursor-pointer rounded-xl border-2 px-3 py-2 text-center text-sm font-semibold", inc.severity === sv ? "border-kruger-orange bg-kruger-orange-soft text-kruger-orange" : "border-kruger-gray/30 text-kruger-dark")}>
              <input type="radio" className="sr-only" checked={inc.severity === sv} onChange={() => setInc({ ...inc, severity: sv })} />
              {sv}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium text-kruger-dark">¿El plan de respuesta registrado fue suficiente para contener el impacto?</legend>
        <div className="mt-2 sm:max-w-sm">
          <Toggle value={sufficient} options={["Sí", "No"]} onChange={(v) => setSufficient(v as "Sí" | "No")} />
        </div>
      </fieldset>
      {sufficient === "Sí" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Acción ejecutada (solución documentada)" htmlFor="exec">
            <input id="exec" className={inputClass} value={inc.executed_action} onChange={(e) => setInc({ ...inc, executed_action: e.target.value })} />
          </Field>
          <Field label="Reserva de contingencia usada (USD)" htmlFor="cont-used">
            <input id="cont-used" type="number" min={0} className={inputClass} value={inc.contingency_used} onChange={(e) => setInc({ ...inc, contingency_used: e.target.value })} />
          </Field>
        </div>
      )}
      {sufficient === "No" && (
        <Hint>Afecta costo, tiempo o alcance: el asistente creará automáticamente una Solicitud de Cambio (acción correctiva) para iniciar la escalera de control de cambios.</Hint>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          className={btnPrimary}
          disabled={!valid}
          onClick={() =>
            onDone(
              sufficient === "Sí"
                ? { ...inc, status: "Resuelto", plan_sufficient: true, resolution: inc.executed_action }
                : { ...inc, status: "En resolución", plan_sufficient: false, baseline_impacted: true },
              sufficient === "Sí",
            )
          }
        >
          Convertir en incidente
        </button>
        <button type="button" className={btnSecondary} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </section>
  );
}

function IncidentCard({ incident: i, onRaiseChange }: { incident: Incident; onRaiseChange: () => void }) {
  const { saveIncident } = useProject();
  const [resolution, setResolution] = useState("");
  return (
    <li className="rounded-2xl border border-kruger-gray/25 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-kruger-dark">{i.title}</p>
          <p className="mt-1 text-xs text-kruger-dark/60">
            {i.severity} · {i.assigned_to} · {formatDate(i.reported_date)}
            {i.derived_from_risk_id && " · Derivado de un riesgo"}
            {num(i.contingency_used) > 0 && ` · Contingencia usada: ${usd(num(i.contingency_used))}`}
          </p>
        </div>
        <span
          className={clsx(
            "rounded-full px-2 py-0.5 text-xs font-semibold",
            i.status === "Resuelto" ? "bg-semaforo-verde/10 text-semaforo-verde" : i.status === "Abierto" ? "bg-semaforo-rojo/10 text-semaforo-rojo" : "bg-semaforo-ambar/15 text-kruger-dark",
          )}
        >
          {i.status}
        </span>
      </div>
      <p className="mt-2 text-sm text-kruger-dark/80">{i.description}</p>
      {i.change_request_id && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-kruger-dark">
          <AlertTriangle className="h-3.5 w-3.5 text-semaforo-ambar" /> Impacta línea base: Solicitud de Cambio creada.{" "}
          <Link href="/cuestionario/solicitud-cambio" className="text-kruger-orange hover:underline">
            Ver cambio
          </Link>
        </p>
      )}
      {i.status === "Resuelto" ? (
        <p className="mt-2 text-sm text-kruger-dark">Resolución: {i.resolution}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2 border-t border-kruger-gray/15 pt-3 sm:flex-row sm:flex-wrap">
          {i.status === "Abierto" && (
            <button type="button" className={btnSecondary} onClick={() => saveIncident({ ...i, status: "En resolución" })}>
              Atender (en resolución)
            </button>
          )}
          {!i.change_request_id && (
            <button type="button" className={btnSecondary} onClick={onRaiseChange}>
              <FilePlus2 className="h-4 w-4" /> Impacta línea base: crear Solicitud de Cambio
            </button>
          )}
          <input aria-label={`Resolución de ${i.title}`} className={clsx(inputClass, "sm:flex-1")} placeholder="¿Cómo se resolvió?" value={resolution} onChange={(e) => setResolution(e.target.value)} />
          <button type="button" className={btnPrimary} disabled={!resolution.trim()} onClick={() => saveIncident({ ...i, status: "Resuelto", resolution: resolution.trim() })}>
            Marcar resuelto
          </button>
        </div>
      )}
    </li>
  );
}

function Stat({ k, v, danger }: { k: string; v: string; danger?: boolean }) {
  return (
    <div>
      <p className="text-xs text-kruger-dark/55">{k}</p>
      <p className={clsx("mt-0.5 text-lg font-semibold", danger ? "text-semaforo-rojo" : "text-kruger-dark")}>{v}</p>
    </div>
  );
}
