"use client";
import { useTransition } from "react";
import { Plus } from "lucide-react";
import { ChallengeIcon } from "@/components/progress/challenge-icon";

export function TemplatePicker({ month, templates, add }: { month: string; templates: { key: string; title: string; icon: string; summary: string }[]; add: (month: string, key: string) => Promise<void> }) {
  const [pending, start] = useTransition();
  if (!templates.length) return <p className="text-sm text-muted-fg">Ya sumaste todos los de la biblioteca este mes.</p>;
  return (
    <ul className="max-h-[420px] divide-y divide-border overflow-y-auto">
      {templates.map((t) => (
        <li key={t.key} className="flex items-center gap-3 py-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted"><ChallengeIcon icon={t.icon} size={17} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{t.title}</p>
            <p className="line-clamp-2 text-xs text-muted-fg">{t.summary}</p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => start(() => add(month, t.key))}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border hover:bg-muted disabled:opacity-50"
            aria-label={`Agregar ${t.title}`}
          >
            <Plus size={16} />
          </button>
        </li>
      ))}
    </ul>
  );
}
