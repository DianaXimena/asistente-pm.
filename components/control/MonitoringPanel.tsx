"use client";

import { useState } from "react";
import clsx from "clsx";
import { CalendarClock, DollarSign, Users } from "lucide-react";
import { formatDate } from "@/lib/acta";
import { evm } from "@/lib/execution";
import { evmGovernance } from "@/lib/governance";
import { computeSchedule, num, usd } from "@/lib/planning";
import { performanceVsBaseline, resourceUtilization } from "@/lib/portfolio";
import type { Project } from "@/lib/types";
import { HealthBadge, SERIES } from "../portfolio/Portfolio";
import { Tooltip } from "../Tooltip";

/** Indicadores de control: utilización de recursos, cronograma y presupuesto. */
export function MonitoringPanel({ project }: { project: Project }) {
  const perf = performanceVsBaseline(project);
  const reports = [...project.reports].sort((a, b) => a.period.localeCompare(b.period));
  const last = reports[reports.length - 1];
  const h = last ? evm(last) : null;
  const gov = last ? evmGovernance(last, project) : null;
  const finish = project.schedule ? computeSchedule(project.schedule).finish : null;
  const util = resourceUtilization(project);
  const avg = util.length ? Math.round(util.reduce((a, u) => a + u.allocation, 0) / util.length) : null;

  return (
    <section className="animate-enter space-y-4 rounded-2xl border border-kruger-gray/25 bg-white p-6 shadow-card">
      <h2 className="text-base font-semibold text-kruger-dark">Indicadores de Monitoreo y Control</h2>
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Cronograma */}
        <Tile icon={CalendarClock} title="Cronograma" tip="Compara el trabajo planificado (PV) con el realizado (EV) según la línea base del cronograma.">
          {perf ? (
            <>
              <HBar label="Planificado (PV)" pct={perf.planned * 100} color={SERIES.pv} />
              <HBar label="Realizado (EV)" pct={perf.real * 100} color={SERIES.ev} />
              {perf.spi !== null && (
                <p className="mt-2">
                  <HealthBadge label="SPI" value={perf.spi} />
                </p>
              )}
            </>
          ) : (
            <Empty>Requiere las líneas base de cronograma y costos.</Empty>
          )}
          {finish && (
            <p className="mt-2 text-xs text-kruger-dark/60">
              Fin según línea base: {formatDate(finish)}
              {project.acta?.deadline && ` · Límite del Acta: ${formatDate(project.acta.deadline)}`}
            </p>
          )}
        </Tile>

        {/* Presupuesto */}
        <Tile icon={DollarSign} title="Presupuesto" tip="Costo real (AC) frente al valor ganado (EV), ambos como % del presupuesto hasta la conclusión (BAC).">
          {last && h ? (
            <>
              <HBar label="Valor ganado (EV)" pct={(num(last.ev) / num(last.bac)) * 100} color={SERIES.ev} />
              <HBar label="Costo real (AC)" pct={(num(last.ac) / num(last.bac)) * 100} color={SERIES.ac} />
              <p className="mt-2">
                <HealthBadge label="CPI" value={h.cpi} />
              </p>
              <p className="mt-1 text-xs text-kruger-dark/60">
                BAC {usd(num(last.bac))} · EAC {Number.isFinite(h.eac) ? usd(h.eac) : "—"}
              </p>
              {gov && <p className="mt-1 text-xs text-kruger-dark/70">Desviación de costo {gov.cost_deviation_pct}% · {gov.band}</p>}
            </>
          ) : (
            <Empty>Se activa con el primer Informe de Desempeño (AC real).</Empty>
          )}
        </Tile>

        {/* Recursos */}
        <Tile icon={Users} title="Utilización de recursos" tip="Dedicación asignada a cada miembro del equipo y paquetes de trabajo a su cargo (matriz RACI).">
          {util.length ? (
            <>
              {util.map((u) => (
                <HBar key={u.name} label={`${u.name} · ${u.assigned} paq. · ${u.active} activos`} pct={u.allocation} color={SERIES.ev} />
              ))}
              <p className="mt-2 text-xs text-kruger-dark/60">Dedicación promedio: {avg}%</p>
            </>
          ) : (
            <Empty>Se activa con la Asignación de Recursos.</Empty>
          )}
        </Tile>
      </div>

      <SCurve reports={reports} />
    </section>
  );
}

function Tile({ icon: Icon, title, tip, children }: { icon: typeof Users; title: string; tip: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-kruger-gray-soft p-4">
      <Tooltip content={tip} side="top">
        <p className="flex items-center gap-2 text-sm font-semibold text-kruger-dark" tabIndex={0}>
          <Icon className="h-4 w-4 text-kruger-orange" /> {title}
        </p>
      </Tooltip>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function HBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  const v = Math.max(0, Math.round(pct));
  return (
    <div className="mt-2" title={`${label}: ${v}%`}>
      <div className="flex justify-between gap-2 text-[11px] text-kruger-dark/70">
        <span className="truncate">{label}</span>
        <span className="shrink-0 tabular-nums font-medium text-kruger-dark">{v}%</span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-white">
        <div className="h-2 rounded-r-full transition-[width] duration-700" style={{ width: `${Math.min(100, v)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-xs text-kruger-dark/60">{children}</p>;

/** Curva S: valores acumulados PV, EV y AC por periodo, en un único eje (USD). */
function SCurve({ reports }: { reports: Project["reports"] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (reports.length === 0)
    return <p className="rounded-xl bg-kruger-gray-soft p-4 text-xs text-kruger-dark/60">La curva S aparece al publicar Informes de Desempeño.</p>;

  const series = [
    { key: "pv", label: "Planificado (PV)", color: SERIES.pv },
    { key: "ev", label: "Ganado (EV)", color: SERIES.ev },
    { key: "ac", label: "Costo real (AC)", color: SERIES.ac },
  ] as const;
  const W = 640;
  const H = 220;
  const pad = { l: 56, r: 96, t: 12, b: 28 };
  const max = Math.max(...reports.flatMap((r) => [num(r.pv), num(r.ev), num(r.ac), num(r.bac)]));
  const step = niceStep(max / 4);
  const top = Math.ceil(max / step) * step || 1;
  const x = (i: number) => pad.l + (reports.length === 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (reports.length - 1));
  const y = (v: number) => pad.t + (1 - v / top) * (H - pad.t - pad.b);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const lastI = reports.length - 1;
  // Etiquetas finales sin choques: separación mínima de 14px manteniendo el orden.
  const labelY: Record<string, number> = {};
  [...series]
    .map((sr) => ({ key: sr.key, y: y(num(reports[lastI][sr.key])) }))
    .sort((a, b) => a.y - b.y)
    .forEach((l, i, arr) => {
      const prev = i ? labelY[arr[i - 1].key] : -Infinity;
      labelY[l.key] = Math.max(l.y, prev + 14);
    });

  return (
    <figure className="rounded-xl border border-kruger-gray/20 p-4">
      <figcaption className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold text-kruger-dark">Curva S · valor acumulado (USD)</span>
        <span className="flex flex-wrap gap-3 text-xs text-kruger-dark/75">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-3 rounded-sm" style={{ backgroundColor: s.color }} /> {s.label}
            </span>
          ))}
        </span>
      </figcaption>
      <div className="relative mt-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Curva S de PV, EV y AC por periodo">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#E6E8EA" strokeWidth={1} />
              <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="#6B7076">
                {t >= 10000 ? `${Math.round(t / 1000)}K` : t.toLocaleString("es-EC")}
              </text>
            </g>
          ))}
          {reports.map((r, i) => (
            <text key={r.id} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="#6B7076">
              {r.period}
            </text>
          ))}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="#9AA0A6" strokeWidth={1} />}
          {series.map((s) => (
            <g key={s.key}>
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={reports.map((r, i) => `${x(i)},${y(num(r[s.key]))}`).join(" ")}
              />
              {reports.map((r, i) => (
                <circle key={r.id} cx={x(i)} cy={y(num(r[s.key]))} r={4} fill={s.color} stroke="#FFFFFF" strokeWidth={2} />
              ))}
              <text x={x(lastI) + 10} y={labelY[s.key] + 4} fontSize={11} fill="#333333">
                {s.key.toUpperCase()} {Math.round(num(reports[lastI][s.key])).toLocaleString("es-EC")}
              </text>
            </g>
          ))}
          {reports.map((r, i) => (
            <rect
              key={r.id}
              x={x(i) - 24}
              y={pad.t}
              width={48}
              height={H - pad.t - pad.b}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>
        {hover !== null && (
          <div
            className="pointer-events-none absolute top-2 rounded-lg bg-kruger-dark px-3 py-2 text-xs text-white shadow-lg"
            style={{ left: `${(x(hover) / W) * 100}%`, transform: "translateX(-50%)" }}
          >
            <p className="font-semibold">{reports[hover].period}</p>
            {series.map((s) => (
              <p key={s.key} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} /> {s.label}: {usd(num(reports[hover][s.key]))}
              </p>
            ))}
          </div>
        )}
      </div>
      <details className="mt-2 text-xs text-kruger-dark/70">
        <summary className="cursor-pointer">Ver datos en tabla</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="text-kruger-dark/55">
              <th className="py-1 pr-3 font-semibold">Periodo</th>
              <th className="py-1 pr-3 font-semibold">PV</th>
              <th className="py-1 pr-3 font-semibold">EV</th>
              <th className="py-1 font-semibold">AC</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className={clsx("border-t border-kruger-gray/20")}>
                <td className="py-1 pr-3">{r.period}</td>
                <td className="py-1 pr-3">{usd(num(r.pv))}</td>
                <td className="py-1 pr-3">{usd(num(r.ev))}</td>
                <td className="py-1">{usd(num(r.ac))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function niceStep(raw: number): number {
  if (!(raw > 0)) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}
