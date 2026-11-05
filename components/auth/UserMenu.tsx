"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { KeyRound, LogOut, UserCircle2, Users } from "lucide-react";

export interface Me {
  email: string;
  name: string;
  role: "admin" | "pm";
}

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setMe)
      .catch(() => setMe(null));
  }, []);
  return me;
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  window.location.assign("/login");
}

/** Menú del usuario: correo, administración (solo admin), cambio de clave y cierre de sesión. */
export function UserMenu({ compact }: { compact?: boolean }) {
  const me = useMe();
  const [open, setOpen] = useState(false);
  if (!me) return null;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={clsx("inline-flex items-center gap-2 rounded-full border border-kruger-gray/30 bg-white px-3 py-2 text-sm text-kruger-dark transition hover:border-kruger-orange", compact && "w-full")}
      >
        <UserCircle2 className="h-4 w-4 text-kruger-orange" />
        <span className="max-w-[12rem] truncate">{me.email}</span>
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-56 animate-fade overflow-hidden rounded-xl border border-kruger-gray/25 bg-white py-1 shadow-lg">
          <p className="px-4 py-2 text-xs text-kruger-dark/55">{me.role === "admin" ? "Administrador" : "Project Manager"}</p>
          {me.role === "admin" && (
            <Link href="/usuarios" className="flex items-center gap-2 px-4 py-2 text-sm text-kruger-dark hover:bg-kruger-gray-soft">
              <Users className="h-4 w-4 text-kruger-orange" /> Usuarios
            </Link>
          )}
          <Link href="/cambiar-clave" className="flex items-center gap-2 px-4 py-2 text-sm text-kruger-dark hover:bg-kruger-gray-soft">
            <KeyRound className="h-4 w-4 text-kruger-orange" /> Cambiar clave
          </Link>
          <button type="button" onClick={logout} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-kruger-dark hover:bg-kruger-gray-soft">
            <LogOut className="h-4 w-4 text-kruger-orange" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
