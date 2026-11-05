import type { Metadata } from "next";
import { PerformanceReports } from "@/components/execution/PerformanceReports";
import { QuestionnaireLayout } from "@/components/QuestionnaireLayout";

export const metadata: Metadata = { title: "Informe de Desempeño del Trabajo · Asistente PM" };

export default function Page() {
  return (
    <QuestionnaireLayout phase="Ejecución" title="Informe de Desempeño del Trabajo" subtitle="Cierre de mes con valor ganado (EVM) y distribución Push/Pull." wide>
      <PerformanceReports />
    </QuestionnaireLayout>
  );
}
