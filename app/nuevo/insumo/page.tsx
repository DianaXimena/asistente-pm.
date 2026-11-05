import type { Metadata } from "next";
import { FirstInputWizard } from "@/components/onboarding/FirstInputWizard";
import { OnboardingShell } from "@/components/onboarding/Shell";

export const metadata: Metadata = { title: "Primer insumo · Asistente PM" };

export default function InsumoPage() {
  return (
    <OnboardingShell eyebrow="Paso 2 · Detección de enfoque" title="Carga el primer insumo del proyecto">
      <FirstInputWizard />
    </OnboardingShell>
  );
}
