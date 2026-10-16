import { cn } from "@/utils/cn";

export interface CueSelectOption {
  value: string;
  label: string;
}

interface CueSelectProps {
  value: string;
  options: CueSelectOption[];
  onChange: (value: string) => void;
  tone: "start" | "end";
  /** Destaca o seletor (ex.: faixa com ponto personalizado). */
  highlighted?: boolean;
  label: string;
  className?: string;
}

/** Seletor nativo (acessível e leve) no estilo do app. */
export function CueSelect({
  value,
  options,
  onChange,
  tone,
  highlighted = false,
  label,
  className,
}: CueSelectProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      className={cn(
        "h-7 rounded-md border bg-surface px-1.5 text-xs [color-scheme:dark] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wave/50",
        highlighted
          ? tone === "start"
            ? "border-cueA/60 text-cueA"
            : "border-cueB/60 text-cueB"
          : "border-line text-ink-muted hover:text-ink",
        className,
      )}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
