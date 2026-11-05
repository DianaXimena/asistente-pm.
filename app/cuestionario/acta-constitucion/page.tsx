import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ActaWizard } from "@/components/acta/ActaWizard";

export const metadata: Metadata = { title: "Acta de Constitución · Asistente PM" };

export default function ActaPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-12">
      <Link
        href="/proyecto"
        className="inline-flex items-center gap-2 text-sm font-medium text-kruger-orange hover:underline print:hidden"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al Dashboard
      </Link>
      <div className="mb-6 mt-4 print:hidden">
        <p className="text-xs font-medium uppercase tracking-wide text-kruger-dark/55">Iniciación · Cuestionario</p>
        <h1 className="mt-1 text-2xl font-semibold text-kruger-dark sm:text-3xl">Acta de Constitución (Project Charter)</h1>
      </div>
      <ActaWizard />
    </main>
  );
}
