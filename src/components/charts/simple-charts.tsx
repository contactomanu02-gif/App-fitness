"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Gráficos livianos en SVG (una sola serie): barras para cumplimiento y línea para evolución.
 * Tooltip al pasar el mouse o con foco de teclado, y tabla con los mismos datos para leerlos sin gráfico.
 */
type Point = { label: string; value: number | null; detail?: string };

const W = 600;
const H = 180;
const PAD = { top: 12, right: 8, bottom: 26, left: 34 };
const innerW = W - PAD.left - PAD.right;
const innerH = H - PAD.top - PAD.bottom;

function ticks(min: number, max: number) {
  const step = (max - min) / 2;
  return [min, min + step, max].map((v) => Math.round(v * 10) / 10);
}

function Frame({ min, max, unit, children, labels }: { min: number; max: number; unit?: string; children: React.ReactNode; labels: string[] }) {
  const y = (v: number) => PAD.top + innerH - ((v - min) / (max - min || 1)) * innerH;
  const every = Math.ceil(labels.length / 8);
  return (
    <>
      {ticks(min, max).map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth={1} />
          <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" className="fill-muted-fg text-[11px]">
            {t}
            {unit}
          </text>
        </g>
      ))}
      {labels.map((l, i) =>
        i % every === 0 ? (
          <text key={i} x={PAD.left + ((i + 0.5) / labels.length) * innerW} y={H - 8} textAnchor="middle" className="fill-muted-fg text-[11px]">
            {l}
          </text>
        ) : null,
      )}
      {children}
    </>
  );
}

function Tip({ p, x, y }: { p: Point; x: number; y: number }) {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow-md"
      style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, marginTop: -8 }}
      role="status"
    >
      <p className="font-semibold tabular-nums">{p.detail ?? (p.value === null ? "Sin datos" : p.value)}</p>
      <p className="text-muted-fg">{p.label}</p>
    </div>
  );
}

function DataTable({ data, valueLabel }: { data: Point[]; valueLabel: string }) {
  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer text-xs text-muted-fg">Ver como tabla</summary>
      <table className="mt-2 w-full text-left text-xs">
        <thead>
          <tr className="text-muted-fg">
            <th className="py-1 font-medium">Fecha</th>
            <th className="py-1 font-medium">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, i) => (
            <tr key={i} className="border-t border-border">
              <td className="py-1">{p.label}</td>
              <td className="py-1 tabular-nums">{p.detail ?? (p.value === null ? "—" : p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export function BarChart({ data, max = 100, unit = "", label, valueLabel }: { data: Point[]; max?: number; unit?: string; label: string; valueLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const slot = innerW / data.length;
  const bw = Math.min(36, slot * 0.6);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const base = PAD.top + innerH;
  return (
    <div>
      <div className="relative max-w-[680px]">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label}>
          <Frame min={0} max={max} unit={unit} labels={data.map((d) => d.label)}>
            {data.map((d, i) => {
              const cx = PAD.left + slot * (i + 0.5);
              const v = d.value ?? 0;
              const top = y(v);
              const h = Math.max(0, base - top);
              const r = Math.min(4, h);
              return (
                <g key={i}>
                  {d.value !== null && h > 0 ? (
                    <path
                      d={`M${cx - bw / 2},${base} V${top + r} Q${cx - bw / 2},${top} ${cx - bw / 2 + r},${top} H${cx + bw / 2 - r} Q${cx + bw / 2},${top} ${cx + bw / 2},${top + r} V${base} Z`}
                      className={cn("fill-accent transition-opacity", hover !== null && hover !== i && "opacity-60")}
                    />
                  ) : null}
                  <rect
                    x={PAD.left + slot * i}
                    y={PAD.top}
                    width={slot}
                    height={innerH}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${d.label}: ${d.detail ?? (d.value === null ? "sin sesiones" : `${d.value}${unit}`)}`}
                    onPointerEnter={() => setHover(i)}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    className="outline-none"
                  />
                </g>
              );
            })}
          </Frame>
        </svg>
        {hover !== null ? <Tip p={data[hover]} x={PAD.left + slot * (hover + 0.5)} y={y(data[hover].value ?? 0)} /> : null}
      </div>
      <DataTable data={data} valueLabel={valueLabel} />
    </div>
  );
}

export function LineChart({ data, min, max, unit = "", label, valueLabel }: { data: Point[]; min?: number; max?: number; unit?: string; label: string; valueLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const vals = data.map((d) => d.value).filter((v): v is number => v !== null);
  const lo = min ?? Math.floor(Math.min(...vals) * 0.9);
  const hi = max ?? Math.ceil(Math.max(...vals) * 1.1 || 1);
  const slot = innerW / Math.max(1, data.length);
  const x = (i: number) => PAD.left + slot * (i + 0.5);
  const y = (v: number) => PAD.top + innerH - ((v - lo) / (hi - lo || 1)) * innerH;
  const pts = data.map((d, i) => (d.value === null ? null : ([x(i), y(d.value)] as const)));
  const path = pts.reduce((acc, p, i) => (p ? `${acc}${acc && pts[i - 1] ? "L" : "M"}${p[0]},${p[1]}` : acc), "");

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const rel = ((e.clientX - box.left) / box.width) * innerW;
    setHover(Math.max(0, Math.min(data.length - 1, Math.floor(rel / slot))));
  };
  return (
    <div>
      <div className="relative max-w-[680px]">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label}>
          <Frame min={lo} max={hi} unit={unit} labels={data.map((d) => d.label)}>
            {hover !== null ? <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} className="stroke-muted-fg" strokeWidth={1} strokeDasharray="3 3" /> : null}
            <path d={path} fill="none" className="stroke-accent" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {pts.map((p, i) =>
              p ? <circle key={i} cx={p[0]} cy={p[1]} r={hover === i ? 5 : 4} className="fill-accent stroke-card" strokeWidth={2} /> : null,
            )}
            <rect
              x={PAD.left}
              y={PAD.top}
              width={innerW}
              height={innerH}
              fill="transparent"
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
              tabIndex={0}
              aria-label={`${label}. Usá las flechas para recorrer los valores.`}
              onFocus={() => setHover(data.length - 1)}
              onBlur={() => setHover(null)}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? 0) - 1));
                if (e.key === "ArrowRight") setHover((h) => Math.min(data.length - 1, (h ?? 0) + 1));
              }}
              className="outline-none"
            />
          </Frame>
        </svg>
        {hover !== null && data[hover] ? <Tip p={data[hover]} x={x(hover)} y={data[hover].value === null ? PAD.top + innerH : y(data[hover].value!)} /> : null}
      </div>
      <DataTable data={data} valueLabel={valueLabel} />
    </div>
  );
}
