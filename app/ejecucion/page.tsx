import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ExecutionBoard } from "@/components/execution/ExecutionBoard";

export const metadata: Metadata = { title: "Tablero de Ejecución · Asistente PM" };

export default function EjecucionPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-kruger-orange hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver al Dashboard
      </Link>
      <div className="mb-6 mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-kruger-dark/55">Fase de Ejecución</p>
        <h1 className="mt-1 text-2xl font-semibold text-kruger-dark sm:text-3xl">Tablero de Ejecución</h1>
        <p className="mt-2 text-sm text-kruger-dark/65">Avance de paquetes de trabajo, verificación de calidad e impedimentos.</p>
      </div>
      <ExecutionBoard />
    </main>
  );
}
