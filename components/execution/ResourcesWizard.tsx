"use client";

import { useState } from "react";
import clsx from "clsx";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { trackedItems } from "@/lib/execution";
import { num, uid } from "@/lib/planning";
import { useProject } from "@/lib/store";
import { useDraft } from "@/lib/useDraft";
import type { Assignment, Project, ResourcePlan, TeamMember } from "@/lib/types";
import { Field, StepHeading, inputClass } from "../acta/fields";
import { PeopleList } from "../planning/PeopleList";
import { AddBtn, Done, RemoveBtn } from "../planning/ScopeWizard";
import { QuestionnaireGate } from "../QuestionnaireGate";
import { ErrorText, Hint, WizardFrame } from "../wizard";

const TOTAL = 4;
const newMember = (): TeamMember => ({ id: uid("MBR"), name: "", role: "", organization: "", kind: "", allocation: "" });
const memberValid = (m: TeamMember) =>
  [m.name, m.role, m.organization].every((v) => v.trim()) && !!m.kind && num(m.allocation) > 0 && num(m.allocation) <= 100;

export function ResourcesWizard() {
  return <QuestionnaireGate id="asignacion-recursos">{(p) => <Wizard project={p} />}</QuestionnaireGate>;
}

function initialPlan(p: Project): ResourcePlan {
  const base = p.resources ?? { members: [], assignments: [], agreed_with: "", agreed_date: "" };
  const prev = new Map(base.assignments.map((a) => [a.item_id, a]));
  const owners = new Map((p.scope?.deliverables ?? []).flatMap((d) => d.work_packages.map((w) => [w.id, w.owner] as const)));
  return {
    ...base,
    assignments: trackedItems(p).map((it) => prev.get(it.id) ?? { item_id: it.id, item_name: `${it.code} ${it.name}`, accountable: owners.get(it.id) ?? "", responsible: [] }),
  };
}

function Wizard({ project }: { project: Project }) {
  const { saveResources } = useProject();
  const [r, setR, clear] = useDraft<ResourcePlan>(`asistente-pm:${project.project_id}:resources-draft`, () => initialPlan(project));
  const [step, setStep] = useState(1);
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState(false);
  const names = r.members.map((m) => m.name.trim()).filter(Boolean);
  const setMember = (i: number, patch: Partial<TeamMember>) => setR((x) => ({ ...x, members: x.members.map((m, j) => (j === i ? { ...m, ...patch } : m)) }));
  const setAssign = (i: number, patch: Partial<Assignment>) =>
    setR((x) => ({ ...x, assignments: x.assignments.map((a, j) => (j === i ? { ...a, ...patch } : a)) }));
  const assignValid = (a: Assignment) => names.includes(a.accountable) && a.responsible.some((n) => names.includes(n));

  const valid =
    step === 1
      ? r.members.length > 0 && r.members.every(memberValid)
      : step === 2
        ? r.assignments.every(assignValid)
        : step === 3
          ? r.agreed_with.trim().length > 0 && !!r.agreed_date
          : true;
  const unassigned = r.members.filter((m) => !r.assignments.some((a) => a.accountable === m.name || a.responsible.includes(m.name)));

  if (done) return <Done title="Asignación de Recursos formalizada" />;

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
          saveResources(r);
          clear();
          setDone(true);
        } else setStep(step + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      nextLabel={step === TOTAL ? "Formalizar asignación" : "Siguiente"}
      nextIcon={step === TOTAL ? <ShieldCheck className="h-4 w-4" /> : undefined}
    >
      <PeopleList project={project} />
      {step === 1 && (
        <>
          <StepHeading step={1} total={TOTAL} subtitle="Equipo del proyecto" title="¿Quiénes forman el equipo y con qué dedicación?" />
          <ul className="space-y-3">
            {r.members.map((m, i) => (
              <li key={m.id} className={clsx("grid gap-2 rounded-xl p-4 sm:grid-cols-2", touched && !memberValid(m) ? "bg-semaforo-rojo/5" : "bg-kruger-gray-soft")}>
                <input aria-label={`Nombre miembro ${i + 1}`} list="people" className={inputClass} placeholder="Nombre" value={m.name} onChange={(e) => setMember(i, { name: e.target.value })} />
                <input aria-label={`Rol miembro ${i + 1}`} className={inputClass} placeholder="Rol en el proyecto" value={m.role} onChange={(e) => setMember(i, { role: e.target.value })} />
                <input aria-label={`Organización miembro ${i + 1}`} className={inputClass} placeholder="Área u organización" value={m.organization} onChange={(e) => setMember(i, { organization: e.target.value })} />
                <div className="flex gap-2">
                  <select aria-label={`Tipo miembro ${i + 1}`} className={inputClass} value={m.kind} onChange={(e) => setMember(i, { kind: e.target.value as TeamMember["kind"] })}>
                    <option value="">Tipo…</option>
                    <option value="Interno">Interno</option>
                    <option value="Externo">Externo / proveedor</option>
                  </select>
                  <input aria-label={`Dedicación miembro ${i + 1}`} type="number" min={1} max={100} className={clsx(inputClass, "w-28")} placeholder="%" value={m.allocation} onChange={(e) => setMember(i, { allocation: e.target.value })} />
                  <RemoveBtn label={`Eliminar miembro ${i + 1}`} onClick={() => setR((x) => ({ ...x, members: x.members.filter((_, j) => j !== i) }))} />
                </div>
              </li>
            ))}
          </ul>
          <AddBtn onClick={() => setR((x) => ({ ...x, members: [...x.members, newMember()] }))}>Agregar miembro</AddBtn>
          <ErrorText show={touched && !valid}>Agrega al menos un miembro con nombre, rol, organización, tipo y dedicación entre 1% y 100%.</ErrorText>
        </>
      )}

      {step === 2 && (
        <>
          <StepHeading step={2} total={TOTAL} subtitle="Matriz RACI" title="¿Quién responde y quién ejecuta cada paquete de trabajo?" />
          <Hint>A (Accountable): una sola persona rinde cuentas. R (Responsible): quienes ejecutan el trabajo. Ambos deben ser miembros del equipo.</Hint>
          {r.assignments.length === 0 && <Hint>No hay paquetes de trabajo registrados en el asistente (la EDT, el cronograma y los costos se cargaron como archivo).</Hint>}
          <ul className="space-y-3">
            {r.assignments.map((a, i) => (
              <li key={a.item_id} className={clsx("rounded-xl p-4", touched && !assignValid(a) ? "bg-semaforo-rojo/5" : "bg-kruger-gray-soft")}>
                <p className="text-sm font-medium text-kruger-dark">{a.item_name}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-[14rem_1fr] sm:items-start">
                  <select aria-label={`A de ${a.item_name}`} className={inputClass} value={a.accountable} onChange={(e) => setAssign(i, { accountable: e.target.value })}>
                    <option value="">A · Responsable…</option>
                    {names.map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-2">
                    {names.map((n) => {
                      const on = a.responsible.includes(n);
                      return (
                        <label key={n} className={clsx("cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium", on ? "border-kruger-orange bg-kruger-orange-soft text-kruger-orange" : "border-kruger-gray/40 bg-white text-kruger-dark")}>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={on}
                            onChange={() => setAssign(i, { responsible: on ? a.responsible.filter((x) => x !== n) : [...a.responsible, n] })}
                          />
                          R · {n}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <ErrorText show={touched && !valid}>Cada paquete necesita un responsable (A) y al menos un ejecutor (R) del equipo.</ErrorText>
        </>
      )}

      {step === 3 && (
        <>
          <StepHeading step={3} total={TOTAL} subtitle="Formalización" title="¿Con quién se acordó la asignación de los recursos?" />
          <Hint>Los recursos internos se acuerdan con sus gerentes funcionales; los externos, mediante contrato u orden de compra.</Hint>
          <Field label="Acordado con (gerente funcional, proveedor u otro)" htmlFor="agreed">
            <input id="agreed" autoFocus list="people" className={inputClass} value={r.agreed_with} onChange={(e) => setR((x) => ({ ...x, agreed_with: e.target.value }))} />
          </Field>
          <Field label="Fecha del acuerdo" htmlFor="agreed_date">
            <input id="agreed_date" type="date" className={clsx(inputClass, "sm:max-w-xs")} value={r.agreed_date} onChange={(e) => setR((x) => ({ ...x, agreed_date: e.target.value }))} />
          </Field>
          <ErrorText show={touched && !valid}>Indica con quién y cuándo se formalizó.</ErrorText>
        </>
      )}

      {step === 4 && (
        <>
          <StepHeading step={4} total={TOTAL} subtitle="Revisión" title="Revisa la matriz antes de formalizar" />
          {unassigned.length > 0 && (
            <div className="flex gap-2 rounded-xl border border-semaforo-ambar/40 bg-semaforo-ambar/10 p-3 text-sm text-kruger-dark">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-semaforo-ambar" />
              Sin asignación: {unassigned.map((m) => m.name).join(", ")}.
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-kruger-dark/55">
                <tr>
                  <th className="py-2 pr-3 font-semibold">Paquete</th>
                  {r.members.map((m) => (
                    <th key={m.id} className="py-2 pr-3 text-center font-semibold">
                      {m.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-kruger-gray/20">
                {r.assignments.map((a) => (
                  <tr key={a.item_id}>
                    <td className="py-2 pr-3 text-kruger-dark">{a.item_name}</td>
                    {r.members.map((m) => {
                      const code = [a.accountable === m.name ? "A" : "", a.responsible.includes(m.name) ? "R" : ""].filter(Boolean).join("/");
                      return (
                        <td key={m.id} className="py-2 pr-3 text-center font-semibold text-kruger-orange">
                          {code || <span className="text-kruger-dark/30">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </WizardFrame>
  );
}
