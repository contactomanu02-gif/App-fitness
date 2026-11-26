"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, CircleSlash, Flame, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { markAlertRead, markAllAlertsRead } from "@/app/panel/agenda-actions";

type Alert = { id: string; kind: string; message: string; athlete_id: string; when: string };
const ICON = { pain: AlertTriangle, skipped: CircleSlash, rpe_high: Flame } as const;
const TONE: Record<string, string> = { pain: "bg-danger-soft text-danger", skipped: "bg-warn-soft text-warn", rpe_high: "bg-warn-soft text-warn" };
const LABEL: Record<string, string> = { pain: "Dolor", skipped: "No realizada", rpe_high: "Esfuerzo muy alto" };

export function AlertsList({ alerts }: { alerts: Alert[] }) {
  const [pending, start] = useTransition();
  const [all, setAll] = useState(false);
  const shown = all ? alerts : alerts.slice(0, 6);
  return (
    <div>
      <ul className="divide-y divide-border border-t border-border">
        {shown.map((a) => {
          const Icon = ICON[a.kind as keyof typeof ICON] ?? AlertTriangle;
          return (
            <li key={a.id} className="flex items-start gap-3 px-5 py-3">
              <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", TONE[a.kind])} aria-hidden>
                <Icon size={17} />
              </div>
              <Link href={`/panel/alumnos/${a.athlete_id}/seguimiento`} className="min-w-0 flex-1 hover:underline">
                <p className="text-xs font-medium text-muted-fg">{LABEL[a.kind]} · {a.when}</p>
                <p className="text-sm">{a.message}</p>
              </Link>
              <Button variant="ghost" size="icon" aria-label="Marcar como vista" disabled={pending} onClick={() => start(() => markAlertRead(a.id))}>
                <Check size={16} />
              </Button>
            </li>
          );
        })}
      </ul>
      {alerts.length > 1 ? (
        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-2.5">
          {alerts.length > shown.length ? (
            <Button variant="ghost" size="sm" onClick={() => setAll(true)}>Ver todos ({alerts.length})</Button>
          ) : <span />}
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => start(() => markAllAlertsRead())}>Marcar todas como vistas</Button>
        </div>
      ) : null}
    </div>
  );
}
