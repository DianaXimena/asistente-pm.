"use client";

import clsx from "clsx";
import { Check, Lock } from "lucide-react";
import { phaseSemaforo } from "@/lib/assistant";
import type { Phase, PhaseId } from "@/lib/types";
import { ProgressBar } from "./ProgressBar";
import { SemaforoDot } from "./Semaforo";

interface Props {
  phases: Phase[];
  currentPhase: PhaseId;
  selectedPhase: PhaseId;
  onSelect: (id: PhaseId) => void;
}

/** Barra de progreso lateral por fases (stepper vertical). */
export function PhaseStepper({ phases, currentPhase, selectedPhase, onSelect }: Props) {
  const currentIndex = phases.findIndex((p) => p.id === currentPhase);

  return (
    <ol className="relative">
      {phases.map((phase, index) => {
        const isCurrent = phase.id === currentPhase;
        const isDone = phase.status === "Completada";
        const isLocked = index > currentIndex && !isDone;
        const isSelected = phase.id === selectedPhase;
        const isLast = index === phases.length - 1;

        return (
          <li key={phase.id} className="relative pb-2">
            {!isLast && (
              <span
                aria-hidden
                className={clsx(
                  "absolute left-[1.15rem] top-10 h-[calc(100%-1.75rem)] w-0.5",
                  isDone ? "bg-kruger-orange" : "bg-kruger-gray/30",
                )}
              />
            )}
            <button
              type="button"
              onClick={() => onSelect(phase.id)}
              aria-current={isCurrent ? "step" : undefined}
              className={clsx(
                "group flex w-full items-start gap-3 rounded-xl p-2 text-left transition",
                isSelected ? "bg-kruger-orange-soft" : "hover:bg-kruger-gray-soft",
              )}
            >
              <span
                className={clsx(
                  "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold",
                  isDone && "border-kruger-orange bg-kruger-orange text-white",
                  isCurrent && !isDone && "border-kruger-orange bg-white text-kruger-orange ring-4 ring-kruger-orange/15",
                  isLocked && "border-kruger-gray/40 bg-white text-kruger-gray",
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : isLocked ? <Lock className="h-3.5 w-3.5" /> : index + 1}
              </span>

              <span className="min-w-0 flex-1 pt-0.5">
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={clsx(
                      "truncate text-sm font-semibold",
                      isLocked ? "text-kruger-dark/50" : "text-kruger-dark",
                    )}
                  >
                    {phase.phase_name}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs tabular-nums text-kruger-dark/60">
                    {phase.progress_percentage}%
                    <SemaforoDot value={phaseSemaforo(phase.status)} />
                  </span>
                </span>
                <span className="mt-0.5 block text-xs text-kruger-dark/55">
                  {isCurrent ? "Fase actual" : phase.status}
                </span>
                <span className="mt-2 block">
                  <ProgressBar value={phase.progress_percentage} size="sm" label={`Progreso de ${phase.phase_name}`} />
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
