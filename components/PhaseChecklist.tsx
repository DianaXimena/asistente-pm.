import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { inputSemaforo } from "@/lib/assistant";
import type { Phase } from "@/lib/types";
import { SemaforoDot, SemaforoLegend } from "./Semaforo";

/** Checklist de insumos mínimos obligatorios (bloqueantes) de una fase. */
export function PhaseChecklist({ phase, isCurrent }: { phase: Phase; isCurrent: boolean }) {
  const approved = phase.mandatory_inputs.filter((i) => i.status === "Aprobado").length;

  return (
    <section className="rounded-2xl border border-kruger-gray/25 bg-white p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-kruger-dark">Insumos obligatorios · {phase.phase_name}</h2>
          <p className="mt-1 text-sm text-kruger-dark/60">
            {approved} de {phase.mandatory_inputs.length} aprobados
            {!isCurrent && " · vista previa de la fase"}
          </p>
        </div>
        <SemaforoLegend />
      </div>

      <ul className="mt-5 divide-y divide-kruger-gray/20">
        {phase.mandatory_inputs.map((input) => {
          const content = (
            <>
              <SemaforoDot value={inputSemaforo(input.status, isCurrent)} />
              <span className="min-w-0 flex-1 truncate text-sm text-kruger-dark">{input.artifact_name}</span>
              <span className="shrink-0 rounded-full bg-kruger-gray-soft px-2.5 py-0.5 text-xs text-kruger-dark/70">
                {input.status}
              </span>
            </>
          );
          return (
            <li key={input.artifact_name}>
              {isCurrent && input.questionnaire && input.status !== "Aprobado" ? (
                <Link
                  href={`/cuestionario/${input.questionnaire}`}
                  className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition hover:bg-kruger-orange-soft"
                >
                  {content}
                  <ChevronRight className="h-4 w-4 shrink-0 text-kruger-orange" />
                </Link>
              ) : (
                <div className="flex items-center gap-3 py-3">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
