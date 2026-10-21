import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CuePad, type PadChip } from "@/components/CuePad";
import type { CueRef, CueRole, PlaylistCueSettings } from "@/types/cues";
import { cueOptionLabel, hotCueIndexOf } from "@/utils/cues";

interface CueSettingsBarProps {
  settings: PlaylistCueSettings;
  /** Índices de hot cue existentes nas faixas da playlist. */
  availableIndexes: number[];
  customizedTrackCount: number;
  canReset: boolean;
  onChange: (role: CueRole, ref: CueRef) => void;
  onReset: () => void;
}

/** Padrão do cálculo para a playlist inteira (cada faixa pode abrir exceção na tabela). */
export function CueSettingsBar({
  settings,
  availableIndexes,
  customizedTrackCount,
  canReset,
  onChange,
  onReset,
}: CueSettingsBarProps) {
  const available = new Set(availableIndexes);

  const chipForRole =
    (role: CueRole) =>
    (ref: CueRef): PadChip => {
      const label = cueOptionLabel(ref);
      const blockedBoundary = role === "start" ? "track-end" : "track-start";
      if (ref === blockedBoundary) {
        return {
          state: "blocked",
          color: null,
          disabled: true,
          title: `${label} — não se aplica ao ponto ${role === "start" ? "inicial" : "final"}`,
        };
      }

      const index = hotCueIndexOf(ref);
      const present = index === null || available.has(index);

      if (settings[role] === ref) {
        return {
          state: "default",
          color: null,
          disabled: false,
          title: `${label} — padrão atual da playlist${present ? "" : " (nenhuma faixa tem este hot cue)"}`,
        };
      }
      if (!present) {
        return {
          state: "missing",
          color: null,
          disabled: false,
          title: `${label} — nenhuma faixa desta playlist tem este hot cue`,
        };
      }
      return {
        state: "idle",
        color: null,
        disabled: false,
        title: `Usar ${label} como padrão da playlist`,
      };
    };

  const pick = (role: CueRole) => (ref: CueRef) => {
    if (ref !== settings[role]) onChange(role, ref);
  };

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line bg-surface-raised px-5 py-2">
      <span className="text-xs font-medium text-ink-muted">Pontos do cálculo (playlist)</span>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-cueA">Início</span>
        <CuePad
          role="start"
          label="Ponto inicial padrão da playlist"
          chipFor={chipForRole("start")}
          onPick={pick("start")}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-cueB">Fim</span>
        <CuePad
          role="end"
          label="Ponto final padrão da playlist"
          chipFor={chipForRole("end")}
          onPick={pick("end")}
        />
      </div>

      {customizedTrackCount > 0 && (
        <span className="text-[11px] text-ink-faint">
          {customizedTrackCount === 1
            ? "1 faixa com ponto personalizado"
            : `${customizedTrackCount} faixas com pontos personalizados`}
        </span>
      )}

      <Button
        variant="outline"
        size="sm"
        className="ml-auto"
        onClick={onReset}
        disabled={!canReset}
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
        Restaurar padrão
      </Button>
    </div>
  );
}
