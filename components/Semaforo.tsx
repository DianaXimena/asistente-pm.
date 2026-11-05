import clsx from "clsx";
import type { Semaforo } from "@/lib/types";

const DOT: Record<Semaforo, string> = {
  verde: "bg-semaforo-verde",
  ambar: "bg-semaforo-ambar",
  rojo: "bg-semaforo-rojo",
  neutro: "bg-kruger-gray/50",
};

export const SEMAFORO_LABEL: Record<Semaforo, string> = {
  verde: "Completo",
  ambar: "Pendiente",
  rojo: "Bloqueante",
  neutro: "Sin iniciar",
};

export function SemaforoDot({ value, className }: { value: Semaforo; className?: string }) {
  return (
    <span
      aria-label={SEMAFORO_LABEL[value]}
      title={SEMAFORO_LABEL[value]}
      className={clsx("inline-block h-2.5 w-2.5 shrink-0 rounded-full", DOT[value], className)}
    />
  );
}

export function SemaforoLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-kruger-dark/70">
      {(["verde", "ambar", "rojo"] as const).map((s) => (
        <li key={s} className="flex items-center gap-1.5">
          <SemaforoDot value={s} />
          {SEMAFORO_LABEL[s]}
        </li>
      ))}
    </ul>
  );
}
