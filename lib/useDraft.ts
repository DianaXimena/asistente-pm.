"use client";

import { useEffect, useState } from "react";

/** Estado con borrador guardado en el navegador (sobrevive a recargas). */
export function useDraft<T>(key: string, initial: () => T): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
      if (raw) return JSON.parse(raw) as T;
    } catch {
      /* ignorar */
    }
    return initial();
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignorar */
    }
  }, [key, value]);

  const clear = () => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignorar */
    }
  };
  return [value, setValue, clear];
}
