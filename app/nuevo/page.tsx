import type { Metadata } from "next";
import { NewProjectForm } from "@/components/onboarding/NewProjectForm";
import { OnboardingShell } from "@/components/onboarding/Shell";

export const metadata: Metadata = { title: "Nuevo proyecto · Asistente PM" };

export default function NuevoPage() {
  return (
    <OnboardingShell eyebrow="Paso 1 · Nuevo proyecto" title="¿Para qué cliente y qué proyecto trabajaremos?">
      <NewProjectForm />
    </OnboardingShell>
  );
}
