import type { Metadata } from "next";
import { RiskRegister } from "@/components/planning/RiskRegister";
import { QuestionnaireLayout } from "@/components/QuestionnaireLayout";

export const metadata: Metadata = { title: "Registro de Riesgos · Asistente PM" };

export default function Page() {
  return (
    <QuestionnaireLayout phase="Planificación" title="Registro de Riesgos" subtitle="Cada riesgo con probabilidad, impacto, estrategia de respuesta y dueño asignado." wide>
      <RiskRegister />
    </QuestionnaireLayout>
  );
}
