"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select } from "@/components/ui/form";

export function ExercisePicker({ options, value }: { options: { v: string; label: string }[]; value: string }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  return (
    <Select
      aria-label="Ejercicio"
      value={value}
      className="mb-3 max-w-sm"
      onChange={(e) => {
        const q = new URLSearchParams(sp);
        q.set("ej", e.target.value);
        router.replace(`${path}?${q}`, { scroll: false });
      }}
    >
      {options.map((o) => (
        <option key={o.v} value={o.v}>{o.label}</option>
      ))}
    </Select>
  );
}
