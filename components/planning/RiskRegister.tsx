"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { CheckCircle2, LayoutDashboard, Pencil, Plus, Trash2 } from "lucide-react";
import { contingencyFromRisks, emv, isRiskComplete, newRisk, riskStatement, usd } from "@/lib/planning";
import { useProject } from "@/lib/store";
import type { Project, Risk } from "@/lib/types";
import { QuestionnaireGate } from "../QuestionnaireGate";
import { btnPrimary, btnSecondary, card } from "../ui";
import { RiskForm } from "./RiskForm";
import { BlockedAction, type Blocker } from "../BlockedAction";

export function RiskRegister() {
  return <QuestionnaireGate id="registro-riesgos">{(p) => <Register project={p} />}</QuestionnaireGate>;
}

function Register({ project }: { project: Project }) {
  const { saveRisk, removeRisk, approveRiskRegister } = useProject();
  const [editing, setEditing] = useState<Risk | null>(null);
  const list = project.risks;
  const complete = list.filter(isRiskComplete).length;
  const canApprove = list.length > 0 && complete === list.length;
  const reserve = contingencyFromRisks(list);
  const blockers: Blocker[] = [
    ...(list.length === 0 ? [{ label: "Registrar al menos un riesgo", action: () => setEditing(newRisk()) }] : []),
    ...list
      .filter((r) => !isRiskComplete(r))
      .map((r) => ({ label: r.owner.trim() ? `Completar el riesgo ${r.risk_id}` : `Asignar dueño al riesgo ${r.risk_id}`, action: () => setEditing(r) })),
  ];

  if (editing)
    return (
      <RiskForm
        key={editing.risk_id}
        project={project}
        initial={editing}
        onCancel={() => setEditing(null)}
        onSave={(r) => {
          saveRisk(r);
          setEditing(null);
        }}
      />
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-card">
        <p className="text-sm text-kruger-dark">
          <strong>{list.length}</strong> riesgos · <strong>{complete}</strong> completos
          {project.risk_register_approved && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-semaforo-verde/10 px-2 py-0.5 text-xs font-semibold text-semaforo-verde">
              <CheckCircle2 className="h-3.5 w-3.5" /> Registro aprobado
            </span>
          )}
        </p>
        <button type="button" className={btnPrimary} onClick={() => setEditing(newRisk())}>
          <Plus className="h-4 w-4" /> Agregar riesgo
        </button>
      </div>

      {list.length > 0 && (
        <section className={clsx(card, "grid gap-4 sm:grid-cols-3")}>
          <Stat k="Σ EMV Amenazas" v={usd(reserve.threats)} />
          <Stat k="Σ EMV Oportunidades" v={usd(reserve.opportunities)} />
          <Stat k="Reserva de Contingencia" v={usd(reserve.total)} strong />
        </section>
      )}

      {list.length === 0 && (
        <div className={clsx(card, "text-center text-sm text-kruger-dark/70")}>Aún no hay riesgos registrados.</div>
      )}

      <ul className="space-y-3">
        {list.map((r) => (
          <li key={r.risk_id} id={`risk-${r.risk_id}`} className="rounded-2xl border border-kruger-gray/25 bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="min-w-0 flex-1 text-sm text-kruger-dark">{riskStatement(r)}</p>
              <span
                className={clsx(
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                  r.type === "Oportunidad" ? "bg-semaforo-verde/10 text-semaforo-verde" : "bg-semaforo-rojo/10 text-semaforo-rojo",
                )}
              >
                {r.type || "—"}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <Stat k="Probabilidad" v={r.probability ? `${r.probability}%` : "—"} />
              <Stat k="EMV" v={usd(emv(r))} />
              <Stat k="Estrategia" v={r.strategy || "—"} />
              <Stat k="Dueño" v={r.owner || "Sin dueño"} />
            </dl>
            <div className="mt-4 flex gap-2 border-t border-kruger-gray/15 pt-3">
              <button type="button" onClick={() => setEditing(r)} className="inline-flex items-center gap-1 text-xs font-medium text-kruger-orange hover:underline">
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
              <button
                type="button"
                onClick={() => removeRisk(r.risk_id)}
                className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-kruger-dark/55 hover:text-semaforo-rojo"
              >
                <Trash2 className="h-3.5 w-3.5" /> Eliminar
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col-reverse justify-between gap-3 border-t border-kruger-gray/25 pt-6 sm:flex-row sm:items-center">
        <Link href="/proyecto" className={btnSecondary}>
          <LayoutDashboard className="h-4 w-4" /> Volver al Dashboard
        </Link>
        {!project.risk_register_approved && (
          <div className="flex flex-col items-stretch gap-1 sm:items-end">
            <BlockedAction blockers={canApprove ? [] : blockers}>
              <button type="button" disabled={!canApprove} onClick={approveRiskRegister} className={btnPrimary}>
                <CheckCircle2 className="h-4 w-4" /> Aprobar Registro de Riesgos
              </button>
            </BlockedAction>
            {!canApprove && <span className="text-xs text-kruger-dark/55">Requiere al menos un riesgo y todos con dueño asignado.</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-kruger-dark/55">{k}</dt>
      <dd className={clsx("mt-0.5 font-medium", strong ? "text-lg text-kruger-orange" : "text-kruger-dark")}>{v}</dd>
    </div>
  );
}
