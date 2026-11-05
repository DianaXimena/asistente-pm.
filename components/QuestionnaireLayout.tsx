import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function QuestionnaireLayout({
  phase,
  title,
  subtitle,
  wide,
  children,
}: {
  phase: string;
  title: string;
  subtitle?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className={`mx-auto px-4 py-8 sm:px-8 sm:py-12 ${wide ? "max-w-4xl" : "max-w-3xl"}`}>
      <Link href="/proyecto" className="inline-flex items-center gap-2 text-sm font-medium text-kruger-orange hover:underline print:hidden">
        <ArrowLeft className="h-4 w-4" /> Volver al Dashboard
      </Link>
      <div className="mb-6 mt-4 print:hidden">
        <p className="text-xs font-medium uppercase tracking-wide text-kruger-dark/55">{phase} · Cuestionario</p>
        <h1 className="mt-1 text-2xl font-semibold text-kruger-dark sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-kruger-dark/65">{subtitle}</p>}
      </div>
      {children}
    </main>
  );
}
