"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/lib/store";
import type { Project } from "@/lib/types";

/** Redirige a la creación del proyecto si todavía no existe uno. */
export function RequireProject({ children }: { children: (project: Project) => React.ReactNode }) {
  const { project, hydrated } = useProject();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !project) router.replace("/nuevo");
  }, [hydrated, project, router]);

  if (!hydrated || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-kruger-orange/20 border-t-kruger-orange" aria-label="Cargando" />
      </div>
    );
  }
  return <>{children(project)}</>;
}
