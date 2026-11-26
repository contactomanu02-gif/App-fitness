"use client";
import { useTransition } from "react";
import { Badge } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { ConfirmAction } from "@/components/confirm-action";
import { INJURY_STATUS, SEVERITIES, labelOf } from "@/lib/athletes";
import { formatDate } from "@/lib/utils";

export type Injury = {
  id: string;
  body_area: string;
  description: string | null;
  severity: string;
  status: string;
  started_on: string | null;
  resolved_on: string | null;
  limitations: string | null;
  reported_by_athlete?: boolean;
};

export function InjuryList({
  injuries,
  onStatus,
  onDelete,
}: {
  injuries: Injury[];
  onStatus?: (id: string, status: "activa" | "en_recuperacion" | "resuelta") => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const [pending, start] = useTransition();
  if (!injuries.length) return <p className="text-sm text-muted-fg">Sin lesiones registradas.</p>;
  return (
    <ul className="space-y-3">
      {injuries.map((i) => (
        <li key={i.id} className="rounded-xl border border-border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{i.body_area}</p>
            <Badge tone={i.status === "resuelta" ? "neutral" : i.severity === "grave" ? "danger" : "warn"}>
              {labelOf(INJURY_STATUS, i.status)} · {labelOf(SEVERITIES, i.severity).toLowerCase()}
            </Badge>
            {i.reported_by_athlete ? <Badge tone="accent">Reportada por el alumno</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-muted-fg">
            {i.started_on ? `Desde el ${formatDate(i.started_on)}` : null}
            {i.resolved_on ? ` · resuelta el ${formatDate(i.resolved_on)}` : null}
          </p>
          {i.description ? <p className="mt-2 text-sm whitespace-pre-line">{i.description}</p> : null}
          {i.limitations ? (
            <p className="mt-2 text-sm">
              <span className="font-medium">Limitaciones: </span>
              <span className="whitespace-pre-line">{i.limitations}</span>
            </p>
          ) : null}
          {onStatus || onDelete ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {onStatus ? (
                <Select
                  aria-label={`Estado de ${i.body_area}`}
                  className="h-9 w-auto text-sm"
                  value={i.status}
                  disabled={pending}
                  onChange={(e) => {
                    const v = e.target.value as "activa" | "en_recuperacion" | "resuelta";
                    start(() => onStatus(i.id, v));
                  }}
                >
                  {INJURY_STATUS.map((s) => (
                    <option key={s.v} value={s.v}>{s.label}</option>
                  ))}
                </Select>
              ) : null}
              {onDelete ? (
                <ConfirmAction label="Eliminar" question="¿Eliminar este registro?" confirmLabel="Eliminar" variant="ghost" onConfirm={() => onDelete(i.id)} />
              ) : null}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
