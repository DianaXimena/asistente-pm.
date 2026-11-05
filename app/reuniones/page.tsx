import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MeetingsScreen } from "@/components/tools/Tools";

export const metadata: Metadata = { title: "Actas de Reunión · Asistente PM" };

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-kruger-orange hover:underline print:hidden">
        <ArrowLeft className="h-4 w-4" /> Volver al Dashboard
      </Link>
      <div className="mb-6 mt-4 print:hidden">
        <p className="text-xs font-medium uppercase tracking-wide text-kruger-dark/55">Herramienta del proyecto</p>
        <h1 className="mt-1 text-2xl font-semibold text-kruger-dark sm:text-3xl">Actas de Reunión</h1>
        <p className="mt-2 text-sm text-kruger-dark/65">Registro de reuniones con decisiones y tareas con responsable.</p>
      </div>
      <MeetingsScreen />
    </main>
  );
}
