import { CuePad, type PadChip } from "@/components/CuePad";
import { cueOptionLabel, cueSecondsOf, hotCueIndexOf } from "@/utils/cues";
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

/**
 * Seletor (|<- A B C D / ->| E F G H) de uma faixa. Um clique escolhe o ponto;
 * clicar no ponto personalizado ou no ponto padrão volta a faixa a seguir a playlist.
 */
export function CueChips({ role, row, defaultRef, onChange }: CueChipsProps) {
  const { track } = row;
  const resolved = role === "start" ? row.start : row.end;
  const overridden = role === "start" ? row.startOverridden : row.endOverridden;

  const chipFor = (ref: CueRef): PadChip => {
    const label = cueOptionLabel(ref);

    // |<- só vale como início; ->| só vale como fim.
    const blockedBoundary = role === "start" ? "track-end" : "track-start";
    if (ref === blockedBoundary) {
      return {
        state: "blocked",
        color: null,
        disabled: true,
        title: `${label} — não se aplica ao ponto ${role === "start" ? "inicial" : "final"}`,
      };
    }

    const seconds = cueSecondsOf(track, ref);
    const exists = seconds !== null;
    const isEffective = resolved.ref === ref;
    const index = hotCueIndexOf(ref);
    const cue = index !== null ? track.hotCues.find((c) => c.index === index) : undefined;

    const state: PadChip["state"] = exists
      ? isEffective
        ? overridden
          ? "override"
          : "default"
        : "idle"
      : isEffective
        ? "ghost"
        : "missing";

    let title = exists
      ? `${label}${cue?.name ? ` "${cue.name}"` : ""} · ${formatMinutesSeconds(seconds)}`
      : `${label} — ausente nesta faixa`;
    if (state === "override") title += " — personalizado (clique para voltar ao padrão)";
    else if (state === "default") title += " — padrão da playlist";
    else if (state === "ghost") {
      title += `; usando ${role === "start" ? "o início" : "o fim"} da faixa`;
      if (overridden) title += " (clique para voltar ao padrão)";
    }

    return {
      state,
      color: cue?.color ?? null,
      title,
      // Fantasma sem exceção = padrão ausente nesta faixa: nada a clicar.
      disabled: state === "missing" || (state === "ghost" && !overridden),
    };
  };

  const onPick = (ref: CueRef) => {
    const next = ref === defaultRef || (overridden && ref === resolved.ref) ? null : ref;
    if (next === null && !overridden) return; // já está seguindo o padrão
    onChange(next);
  };

  return (
    <CuePad
      role={role}
      label={`${role === "start" ? "Ponto inicial" : "Ponto final"} de ${track.title}`}
      chipFor={chipFor}
      onPick={onPick}
    />
  );
}
