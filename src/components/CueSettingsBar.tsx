import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CueSelect } from "@/components/CueSelect";
import type { CueRef, CueRole, PlaylistCueSettings } from "@/types/cues";
import { buildCueOptions, isCueRef } from "@/utils/cues";

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
  const handle = (role: CueRole) => (value: string) => {
    if (isCueRef(value)) onChange(role, value);
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface-raised px-5 py-2">
      <span className="text-xs font-medium text-ink-muted">
        Pontos do cálculo (playlist)
      </span>

      <label className="flex items-center gap-2 text-xs text-cueA">
        Início
        <CueSelect
          tone="start"
          label="Ponto inicial padrão da playlist"
          value={settings.start}
          options={buildCueOptions("start", availableIndexes, settings.start)}
          onChange={handle("start")}
        />
      </label>

      <label className="flex items-center gap-2 text-xs text-cueB">
        Fim
        <CueSelect
          tone="end"
          label="Ponto final padrão da playlist"
          value={settings.end}
          options={buildCueOptions("end", availableIndexes, settings.end)}
          onChange={handle("end")}
        />
      </label>

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
