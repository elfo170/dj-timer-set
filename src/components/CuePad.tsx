import { ArrowLeftToLine, ArrowRightToLine } from "lucide-react";
import { cn } from "@/utils/cn";
import { readableTextColor } from "@/utils/color";
import { hotCueRef, shortCueLabel } from "@/utils/cues";
import type { CueRef, CueRole } from "@/types/cues";

export type PadChipState =
  | "override" // ponto efetivo, escolhido para esta faixa
  | "default" // ponto efetivo, vindo do padrão da playlist
  | "ghost" // ponto efetivo, mas o hot cue não existe nesta faixa
  | "idle" // disponível, não selecionado
  | "missing" // não existe aqui
  | "blocked"; // não se aplica a este papel (ex.: fim da faixa como início)

export interface PadChip {
  state: PadChipState;
  /** Cor "#RRGGBB" do hot cue no Rekordbox (null = neutro). */
  color: string | null;
  title: string;
  disabled: boolean;
}

interface CuePadProps {
  role: CueRole;
  label: string;
  chipFor: (ref: CueRef) => PadChip;
  onPick: (ref: CueRef) => void;
}

/**
 * Ordem de leitura do seletor (grade de 5 colunas × 2 linhas):
 *   |<-  A B C D
 *   ->|  E F G H
 */
const PAD_REFS: CueRef[] = [
  "track-start",
  hotCueRef(0),
  hotCueRef(1),
  hotCueRef(2),
  hotCueRef(3),
  "track-end",
  hotCueRef(4),
  hotCueRef(5),
  hotCueRef(6),
  hotCueRef(7),
];

// Classes completas (não montadas dinamicamente) para o Tailwind enxergá-las.
const TONES = {
  start: {
    ring: "ring-cueA",
    solid: "border-cueA bg-cueA text-surface",
    soft: "border-cueA/70 bg-cueA/15 text-cueA",
    ghost: "border-dashed border-cueA/50 text-cueA/60",
    hover: "hover:border-cueA/60 hover:text-cueA",
  },
  end: {
    ring: "ring-cueB",
    solid: "border-cueB bg-cueB text-surface",
    soft: "border-cueB/70 bg-cueB/15 text-cueB",
    ghost: "border-dashed border-cueB/50 text-cueB/60",
    hover: "hover:border-cueB/60 hover:text-cueB",
  },
} as const;

/**
 * Seletor de ponto de corte em duas linhas: |<- A B C D / ->| E F G H.
 * Hot cues com cor conhecida aparecem na cor do Rekordbox; o ponto escolhido
 * ganha um anel (verde = início, laranja = fim) e, quando é exceção da faixa,
 * um pontinho branco no canto.
 */
export function CuePad({ role, label, chipFor, onPick }: CuePadProps) {
  const tone = TONES[role];

  return (
    <div
      role="group"
      aria-label={label}
      className="grid shrink-0 grid-cols-[repeat(5,1.25rem)] gap-1"
    >
      {PAD_REFS.map((ref) => {
        const chip = chipFor(ref);
        const isBoundary = ref === "track-start" || ref === "track-end";
        const selected = chip.state === "override" || chip.state === "default";
        const color = !isBoundary && (selected || chip.state === "idle") ? chip.color : null;

        const neutral = {
          override: tone.solid,
          default: tone.soft,
          ghost: tone.ghost,
          idle: cn("border-line text-ink-muted", tone.hover),
          missing: "border-dashed border-line text-ink-faint/50",
          blocked: "border-dashed border-line text-ink-faint/30",
        }[chip.state];

        return (
          <button
            key={ref}
            type="button"
            disabled={chip.disabled}
            onClick={() => onPick(ref)}
            aria-pressed={selected || chip.state === "ghost"}
            aria-label={chip.title}
            title={chip.title}
            style={
              color
                ? { backgroundColor: color, borderColor: color, color: readableTextColor(color) }
                : undefined
            }
            className={cn(
              "relative inline-flex h-5 w-5 items-center justify-center rounded border font-mono text-[10px] font-semibold leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wave/50 disabled:cursor-default",
              color
                ? selected
                  ? cn("ring-2 ring-offset-1 ring-offset-surface", tone.ring)
                  : "opacity-60 hover:opacity-100"
                : neutral,
            )}
          >
            {ref === "track-start" ? (
              <ArrowLeftToLine className="h-3 w-3" aria-hidden />
            ) : ref === "track-end" ? (
              <ArrowRightToLine className="h-3 w-3" aria-hidden />
            ) : (
              shortCueLabel(ref)
            )}
            {chip.state === "override" && (
              <span
                aria-hidden
                className="absolute -right-[3px] -top-[3px] h-[7px] w-[7px] rounded-full border border-surface bg-white"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
