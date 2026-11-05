"use client";

import clsx from "clsx";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { StepDots } from "./acta/fields";
import { btnGhost, btnPrimary } from "./ui";

/** Marco común de los cuestionarios: indicador de pasos + navegación Atrás/Siguiente. */
export function WizardFrame({
  step,
  total,
  valid,
  onBack,
  onNext,
  backLabel = "Atrás",
  nextLabel = "Siguiente",
  nextIcon,
  children,
}: {
  step: number;
  total: number;
  valid: boolean;
  onBack: () => void;
  onNext: () => void;
  backLabel?: string;
  nextLabel?: string;
  nextIcon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onNext();
      }}
      className="rounded-2xl border border-kruger-gray/25 bg-white p-6 shadow-card sm:p-8"
    >
      <StepDots current={step} total={total} />
      <div className="mt-6 space-y-6">{children}</div>
      <div className="mt-8 flex items-center justify-between gap-3 border-t border-kruger-gray/20 pt-6">
        <button type="button" onClick={onBack} className={btnGhost}>
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </button>
        <button type="submit" aria-disabled={!valid} className={clsx(btnPrimary, !valid && "bg-kruger-gray hover:bg-kruger-gray")}>
          {nextIcon} {nextLabel} {!nextIcon && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </form>
  );
}

export function ErrorText({ show, children }: { show: boolean; children: React.ReactNode }) {
  return show ? <p className="text-xs text-semaforo-rojo">{children}</p> : null;
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-kruger-gray-soft px-4 py-3 text-xs text-kruger-dark/70">{children}</p>;
}
