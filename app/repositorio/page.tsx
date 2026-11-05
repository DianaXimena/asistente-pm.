import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Repository } from "@/components/repository/Repository";

export const metadata: Metadata = { title: "Repositorio de Plantillas · Asistente PM" };

export default function RepositorioPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-kruger-orange hover:underline">
        <ArrowLeft className="h-4 w-4" /> Portafolio
      </Link>
      <div className="mb-6 mt-4 max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-wide text-kruger-dark/55">Gestión documental</p>
        <h1 className="mt-1 text-2xl font-semibold text-kruger-dark sm:text-3xl">Repositorio de Plantillas Estándar (CMMI / PMP)</h1>
        <p className="mt-2 text-sm leading-relaxed text-kruger-dark/70">
          Plantillas que acompañan cada grupo de procesos del ciclo de vida: autorizan el proyecto, integran las líneas base, registran acuerdos y cambios, y
          formalizan el cierre. Cada documento se genera en Google Drive con el encabezado del proyecto, control de versiones, instrucciones de llenado y bloque de
          aprobaciones, organizado por tipo de proyecto.
        </p>
      </div>
      <Repository />
    </main>
  );
}
