"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ArrowRight, Lock } from "lucide-react";

/** Paso pendiente que bloquea una acción: lleva a otra pantalla (href), a un elemento de la misma página (#id) o ejecuta una acción. */
export interface Blocker {
  label: string;
  href?: string;
  action?: () => void;
}

const W = 300;

/** Desplaza hasta un elemento de la página y lo resalta brevemente. */
export function focusAnchor(id: string) {
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("ring-4", "ring-kruger-orange/40", "transition-shadow");
  setTimeout(() => el.classList.remove("ring-4", "ring-kruger-orange/40"), 1800);
  return true;
}

/**
 * Envuelve un botón que depende de pasos previos. Si hay pasos pendientes:
 * - al pasar el mouse o enfocar, muestra la lista de pasos requeridos (cada uno navegable);
 * - al hacer clic, lleva directamente al primer paso pendiente.
 * Sin pendientes, el botón funciona normalmente.
 */
export function BlockedAction({ blockers, children, className }: { blockers: Blocker[]; children: React.ReactNode; className?: string }) {
  const router = useRouter();
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number; above: boolean } | null>(null);

  const go = useCallback(
    (b: Blocker) => {
      setPos(null);
      if (b.action) return b.action();
      if (!b.href) return;
      if (b.href.startsWith("#")) focusAnchor(b.href.slice(1));
      else router.push(b.href);
    },
    [router],
  );

  const show = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const x = Math.max(8, Math.min(window.innerWidth - W - 8, r.left + r.width / 2 - W / 2));
    const above = r.bottom + 220 > window.innerHeight && r.top > 220;
    setPos({ x, y: above ? r.top - 8 : r.bottom + 8, above });
  }, []);
  const hideSoon = useCallback(() => {
    hideTimer.current = setTimeout(() => setPos(null), 180);
  }, []);
  const keep = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [pos]);

  if (blockers.length === 0) return <>{children}</>;

  return (
    <span
      ref={ref}
      role="button"
      tabIndex={0}
      aria-disabled="true"
      aria-describedby={pos ? id : undefined}
      data-blocked="true"
      className={clsx("inline-flex cursor-not-allowed rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-kruger-orange/30", className)}
      onMouseEnter={show}
      onMouseLeave={hideSoon}
      onFocus={show}
      onBlur={hideSoon}
      onClick={() => go(blockers[0])}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go(blockers[0]);
        }
        if (e.key === "Escape") setPos(null);
      }}
    >
      {/* El botón queda visualmente deshabilitado y sin eventos: el clic lo atiende este contenedor. */}
      <span className="pointer-events-none inline-flex w-full">{children}</span>
      {pos &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            onMouseEnter={keep}
            onMouseLeave={hideSoon}
            style={{ position: "fixed", left: pos.x, top: pos.y, width: W, transform: pos.above ? "translateY(-100%)" : undefined }}
            className="z-[100] animate-fade rounded-xl border border-kruger-gray/25 bg-white p-3 text-left text-xs text-kruger-dark shadow-lg print:hidden"
          >
            <p className="flex items-center gap-1.5 font-semibold text-kruger-dark">
              <Lock className="h-3.5 w-3.5 text-kruger-orange" /> {blockers.length === 1 ? "Paso pendiente requerido" : `${blockers.length} pasos pendientes requeridos`}
            </p>
            <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
              {blockers.map((b, i) => (
                <li key={`${b.label}-${i}`}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      go(b);
                    }}
                    className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-kruger-orange-soft"
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-kruger-orange-soft text-[10px] font-bold text-kruger-orange">{i + 1}</span>
                    <span className="flex-1">{b.label}</span>
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kruger-orange" />
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 border-t border-kruger-gray/15 pt-2 text-[11px] text-kruger-dark/55">Haz clic en el botón para ir al primer paso pendiente.</p>
          </div>,
          document.body,
        )}
    </span>
  );
}
