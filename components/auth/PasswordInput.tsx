"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { inputClass } from "../acta/fields";

export function PasswordInput({ id, value, onChange, autoComplete, autoFocus }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string; autoFocus?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        className={`${inputClass} pr-11`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Ocultar clave" : "Mostrar clave"}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-kruger-dark/50 hover:text-kruger-orange"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
