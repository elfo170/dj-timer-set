import { ArrowLeftToLine, ArrowRightToLine } from "lucide-react";
import { cn } from "@/utils/cn";
import {
  cueOptionLabel,
  cueSecondsOf,
  hotCueIndexOf,
  hotCueRef,
  shortCueLabel,
} from "@/utils/cues";
import { formatMinutesSeconds } from "@/utils/time";
import type { CueRef, CueRole } from "@/types/cues";
import type { SetTrackRow } from "@/types/rekordbox";

interface CueChipsProps {
  role: CueRole;
  row: SetTrackRow;
  /** Ponto padrão da playlist para este papel. */
  defaultRef: CueRef;
  /** `null` = voltar ao padrão da playlist. */
  onChange: (ref: CueRef | null) => void;
}

type ChipState =
  | "override" // ponto efetivo, escolhido para esta faixa
  | "default" // ponto efetivo, vindo do padrão da playlist
  | "ghost" // ponto efetivo, mas o hot cue não existe nesta faixa
  | "idle" // disponível, não selecionado
  | "missing"; // não existe nesta faixa

// Classes completas (não montadas dinamicamente) para o Tailwind enxergá-las.
const TONES = {
  start: {
    override: "border-cueA bg-cueA text-surface",
    default: "border-cueA/70 bg-cueA/15 text-cueA",
    ghost: "border-dashed border-cueA/50 text-cueA/60",
    idle: "border-line text-ink-muted hover:border-cueA/60 hover:text-cueA",
  },
  end: {
    override: "border-cueB bg-cueB text-surface",
    default: "border-cueB/70 bg-cueB/15 text-cueB",
    ghost: "border-dashed border-cueB/50 text-cueB/60",
    idle: "border-line text-ink-muted hover:border-cueB/60 hover:text-cueB",
  },
} as const;

const MISSING = "border-dashed border-line text-ink-faint/50";

/**
 * Chips de ponto de corte de uma faixa: início da faixa (só em "start"), hot
 * cues A, B, C… e fim da faixa (só em "end"). Um clique escolhe o ponto; clicar
 * no chip personalizado ou no chip do padrão volta a faixa a seguir a playlist.
 */
export function CueChips({ role, row, defaultRef, onChange }: CueChipsProps) {
  const { track } = row;
  const resolved = role === "start" ? row.start : row.end;
  const overridden = role === "start" ? row.startOverridden : row.endOverridden;

  // Cada linha mostra os hot cues de A até o último que ela tem (letras alinhadas
  // por coluna; lacunas aparecem tracejadas). A e B sempre aparecem, e o ponto
  // configurado também, mesmo ausente — assim se vê por que o cálculo caiu no
  // início/fim da faixa.
  let lastIndex = Math.max(1, ...track.hotCues.map((cue) => cue.index));
  for (const ref of [resolved.ref, defaultRef]) {
    const index = hotCueIndexOf(ref);
    if (index !== null) lastIndex = Math.max(lastIndex, index);
  }
  const hotRefs = Array.from({ length: lastIndex + 1 }, (_, index) => hotCueRef(index));
  const refs: CueRef[] =
    role === "start" ? ["track-start", ...hotRefs] : [...hotRefs, "track-end"];

  const handleClick = (ref: CueRef) => {
    const next = ref === defaultRef || (overridden && ref === resolved.ref) ? null : ref;
    if (next === null && !overridden) return; // já está seguindo o padrão
    onChange(next);
  };

  return (
    <div
      className="flex min-w-0 flex-1 flex-wrap justify-start gap-[3px]"
      role="group"
      aria-label={`${role === "start" ? "Ponto inicial" : "Ponto final"} de ${track.title}`}
    >
      {refs.map((ref) => {
        const seconds = cueSecondsOf(track, ref);
        const exists = seconds !== null;
        const isEffective = resolved.ref === ref;
        const state: ChipState = exists
          ? isEffective
            ? overridden
              ? "override"
              : "default"
            : "idle"
          : isEffective
            ? "ghost"
            : "missing";

        // Chip fantasma sem exceção = padrão ausente nesta faixa: nada a clicar.
        const disabled = state === "missing" || (state === "ghost" && !overridden);

        let title = exists
          ? `${cueOptionLabel(ref)} · ${formatMinutesSeconds(seconds)}`
          : `${cueOptionLabel(ref)} — ausente nesta faixa`;
        if (state === "override") title += " — personalizado (clique para voltar ao padrão)";
        else if (state === "default") title += " — padrão da playlist";
        else if (state === "ghost") {
          title += `; usando ${role === "start" ? "o início" : "o fim"} da faixa`;
          if (overridden) title += " (clique para voltar ao padrão)";
        }

        return (
          <button
            key={ref}
            type="button"
            disabled={disabled}
            onClick={() => handleClick(ref)}
            aria-pressed={isEffective}
            aria-label={title}
            title={title}
            className={cn(
              "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border font-mono text-[10px] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wave/50 disabled:cursor-default",
              state === "missing" ? MISSING : TONES[role][state],
            )}
          >
            {ref === "track-start" ? (
              <ArrowLeftToLine className="h-3 w-3" aria-hidden />
            ) : ref === "track-end" ? (
              <ArrowRightToLine className="h-3 w-3" aria-hidden />
            ) : (
              shortCueLabel(ref)
            )}
          </button>
        );
      })}
    </div>
  );
}
