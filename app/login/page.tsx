import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Ingresar · Asistente PM" };

export default function LoginPage() {
  return (
    <AuthShell title="Ingresar" subtitle="Usa el correo y la clave que te asignó el administrador.">
      <LoginForm />
    </AuthShell>
  );
}
