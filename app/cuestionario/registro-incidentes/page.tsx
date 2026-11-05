import type { Metadata } from "next";
import { IncidentRegister } from "@/components/control/IncidentRegister";
import { QuestionnaireLayout } from "@/components/QuestionnaireLayout";

export const metadata: Metadata = { title: "Registro de Incidentes · Asistente PM" };

export default function Page() {
  return (
    <QuestionnaireLayout phase="Control" title="Registro de Incidentes" subtitle="Hechos presentes: severidad, responsable, plan de respuesta e impacto en líneas base." wide>
      <IncidentRegister />
    </QuestionnaireLayout>
  );
}
