import type { Metadata } from "next";
import { AcceptanceScreen } from "@/components/closure/ClosureScreens";
import { QuestionnaireLayout } from "@/components/QuestionnaireLayout";

export const metadata: Metadata = { title: "Aceptación Formal del Cliente · Asistente PM" };

export default function Page() {
  return (
    <QuestionnaireLayout phase="Cierre" title="Aceptación Formal del Cliente" subtitle="Validar el Alcance y transición de entregables a operaciones." wide>
      <AcceptanceScreen />
    </QuestionnaireLayout>
  );
}
