import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";

export const metadata: Metadata = { title: "Cambiar clave · Asistente PM" };

export default function CambiarClavePage() {
  return (
    <AuthShell title="Cambiar clave" subtitle="Por seguridad, define una clave personal. Si es tu primer ingreso, este paso es obligatorio.">
      <ChangePasswordForm />
    </AuthShell>
  );
}
