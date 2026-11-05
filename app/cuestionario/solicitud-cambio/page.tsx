import type { Metadata } from "next";
import { ChangeLog } from "@/components/control/ChangeLog";
import { QuestionnaireLayout } from "@/components/QuestionnaireLayout";

export const metadata: Metadata = { title: "Registro de Cambios · Asistente PM" };

export default function Page() {
  return (
    <QuestionnaireLayout phase="Control" title="Registro de Cambios" subtitle="Escalera de 9 peldaños del control integrado de cambios." wide>
      <ChangeLog />
    </QuestionnaireLayout>
  );
}
