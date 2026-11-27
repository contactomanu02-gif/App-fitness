import { Bike, Droplets, Flame, Footprints, HeartPulse, Leaf, Moon, Mountain, Sun, Target, Timer, Waves, Wind, Activity } from "lucide-react";

const ICONS = {
  walk: Footprints,
  run: Activity,
  bike: Bike,
  mountain: Mountain,
  water: Droplets,
  moon: Moon,
  flame: Flame,
  heart: HeartPulse,
  timer: Timer,
  wind: Wind,
  swim: Waves,
  leaf: Leaf,
  sun: Sun,
  target: Target,
} as const;

export function ChallengeIcon({ icon, size = 20 }: { icon: string; size?: number }) {
  const Icon = ICONS[icon as keyof typeof ICONS] ?? Activity;
  return <Icon size={size} aria-hidden />;
}

/** Colores que rotan entre desafíos (tokens del tema, así respetan claro/oscuro). */
export const CHALLENGE_TONES = [
  { chip: "bg-accent-soft text-accent", bar: "bg-accent" },
  { chip: "bg-info-soft text-info", bar: "bg-info" },
  { chip: "bg-success-soft text-success", bar: "bg-success" },
  { chip: "bg-violet-soft text-violet", bar: "bg-violet" },
] as const;
