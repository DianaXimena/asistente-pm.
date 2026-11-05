import { Compass } from "lucide-react";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-kruger-gray-soft px-4 py-10">
      <div className="w-full max-w-md animate-enter">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-kruger-orange text-white">
            <Compass className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-kruger-dark">Asistente PM</p>
            <p className="text-xs text-kruger-dark/55">Gestión de proyectos paso a paso</p>
          </div>
        </div>
        <div className="rounded-2xl border border-kruger-gray/25 bg-white p-6 shadow-card sm:p-8">
          <h1 className="text-xl font-semibold text-kruger-dark">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-kruger-dark/65">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
