import { Compass } from "lucide-react";

export function OnboardingShell({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-8 sm:py-16">
      <div className="mb-8 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-kruger-orange text-white">
          <Compass className="h-5 w-5" />
        </span>
        <span className="text-sm font-semibold text-kruger-dark">Asistente PM</span>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-kruger-orange">{eyebrow}</p>
      <h1 className="mb-6 mt-1 text-2xl font-semibold text-kruger-dark sm:text-3xl">{title}</h1>
      {children}
    </main>
  );
}
