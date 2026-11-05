import clsx from "clsx";

export const inputClass =
  "w-full rounded-xl border border-kruger-gray/40 bg-white px-4 py-3 text-sm text-kruger-dark placeholder:text-kruger-gray outline-none transition focus:border-kruger-orange focus:ring-4 focus:ring-kruger-orange/15";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-kruger-dark">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-semaforo-rojo">{error}</p>
      ) : (
        hint && <p className="text-xs text-kruger-dark/55">{hint}</p>
      )}
    </div>
  );
}

export function StepHeading({ step, total, title, subtitle }: { step: number; total: number; title: string; subtitle: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-kruger-orange">
        Paso {step}/{total} · {subtitle}
      </p>
      <h2 className="mt-2 text-xl font-semibold leading-snug text-kruger-dark sm:text-2xl">{title}</h2>
    </div>
  );
}

export function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2" aria-hidden>
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <span
          key={n}
          className={clsx(
            "h-1.5 flex-1 rounded-full transition-colors",
            n <= current ? "bg-kruger-orange" : "bg-kruger-gray/30",
          )}
        />
      ))}
    </div>
  );
}
