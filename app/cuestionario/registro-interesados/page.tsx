import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StakeholderRegister } from "@/components/stakeholders/StakeholderRegister";

export const metadata: Metadata = { title: "Registro de Interesados · Asistente PM" };

export default function InteresadosPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-kruger-orange hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver al Dashboard
      </Link>
      <div className="mb-6 mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-kruger-dark/55">Fase de Inicio · Cuestionario</p>
        <h1 className="mt-1 text-2xl font-semibold text-kruger-dark sm:text-3xl">Registro de Interesados Inicial</h1>
        <p className="mt-2 text-sm text-kruger-dark/65">
          Para cada interesado: identificación, clasificación Poder vs. Interés y nivel de involucramiento actual vs. deseado.
        </p>
      </div>
      <StakeholderRegister />
    </main>
  );
}
