import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuditScreen } from "@/components/audit/AuditScreen";

export const metadata: Metadata = { title: "Bitácora de Auditoría · Asistente PM" };

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-12">
      <Link href="/proyecto" className="inline-flex items-center gap-2 text-sm font-medium text-kruger-orange hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver al Dashboard
      </Link>
      <div className="mb-6 mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-kruger-dark/55">Integridad de datos</p>
        <h1 className="mt-1 text-2xl font-semibold text-kruger-dark sm:text-3xl">Bitácora de Auditoría</h1>
        <p className="mt-2 text-sm text-kruger-dark/65">Cada aprobación queda sellada con la hora del sistema y encadenada a la anterior.</p>
      </div>
      <AuditScreen />
    </main>
  );
}
