"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

const W = 256;
const GAP = 10;

/**
 * Tooltip sutil: aparece al pasar el cursor o al enfocar con teclado.
 * Se dibuja en un portal con posición fija para no quedar recortado por
 * contenedores con desplazamiento, y se reubica si no cabe en la pantalla.
 */
export function Tooltip({
  content,
  children,
  side = "right",
  className,
}: {
  content: string;
  children: React.ReactNode;
  side?: "right" | "top" | "bottom";
  className?: string;
}) {
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number; place: "right" | "top" | "bottom" } | null>(null);
  const [visible, setVisible] = useState(false);

  const show = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    let place = side;
    if (place === "right" && r.right + GAP + W > vw - 8) place = "bottom";
    if (place === "top" && r.top < 90) place = "bottom";
    const clampX = (x: number) => Math.max(8, Math.min(vw - W - 8, x));
    if (place === "right") setPos({ x: r.right + GAP, y: r.top + r.height / 2, place });
    else if (place === "top") setPos({ x: clampX(r.left + r.width / 2 - W / 2), y: r.top - GAP, place });
    else setPos({ x: clampX(r.left + r.width / 2 - W / 2), y: r.bottom + GAP, place });
    setVisible(true);
  }, [side]);
  const hide = useCallback(() => setVisible(false), []);

  useEffect(() => {
    if (!visible) return;
    window.addEventListener("scroll", hide, true);
    return () => window.removeEventListener("scroll", hide, true);
  }, [visible, hide]);

  if (!content) return <>{children}</>;
  return (
    <span
      ref={ref}
      className={clsx("block", className)}
      aria-describedby={visible ? id : undefined}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible &&
        pos &&
        createPortal(
          <span
            role="tooltip"
            id={id}
            style={{
              position: "fixed",
              left: pos.x,
              top: pos.y,
              width: W,
              transform: pos.place === "right" ? "translateY(-50%)" : pos.place === "top" ? "translateY(-100%)" : undefined,
            }}
            className="pointer-events-none z-[100] animate-fade rounded-xl bg-kruger-dark px-3 py-2 text-xs leading-relaxed text-white shadow-lg print:hidden"
          >
            {content}
          </span>,
          document.body,
        )}
    </span>
  );
}
