import clsx from "clsx";

export function ProgressBar({
  value,
  size = "md",
  tone = "orange",
  label,
}: {
  value: number;
  size?: "sm" | "md";
  tone?: "orange" | "white";
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={clsx(
        "w-full overflow-hidden rounded-full",
        size === "sm" ? "h-1.5" : "h-2.5",
        tone === "white" ? "bg-white/25" : "bg-kruger-gray-soft",
      )}
    >
      <div
        className={clsx(
          "h-full rounded-full transition-[width] duration-700 ease-out",
          tone === "white" ? "bg-white" : "bg-kruger-orange",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
