import type { PlaylistCueSettings } from "@/types/cues";
import type {
  RekordboxLibrary,
  RekordboxPlaylist,
  SetSummary,
  SetTrackRow,
} from "@/types/rekordbox";
import { resolveCue } from "@/utils/cues";

/**
 * Monta as linhas do set respeitando exatamente a ordem da playlist.
 *
 * Tempo efetivo de cada faixa = ponto final − ponto inicial, onde cada ponto é
 * o escolhido para a faixa (exceção por faixa) ou, se não houver, o padrão da
 * playlist. Padrão de fábrica: início = Hot Cue A, fim = Hot Cue B; hot cue
 * ausente → início da faixa (00:00) / fim da faixa (duração total).
 *
 * As exceções são indexadas pelo id da faixa: se a mesma faixa aparece duas
 * vezes na playlist, as duas linhas compartilham a mesma exceção.
 */
export function buildSetRows(
  playlist: RekordboxPlaylist,
  library: RekordboxLibrary,
  settings: PlaylistCueSettings,
): SetTrackRow[] {
  const rows: SetTrackRow[] = [];
  for (const trackId of playlist.trackIds) {
    const track = library.tracks.get(trackId);
    if (!track) continue; // referência órfã no XML

    const override = settings.overrides[track.id];
    const start = resolveCue(track, override?.start ?? settings.start, "start");
    const end = resolveCue(track, override?.end ?? settings.end, "end");

    rows.push({
      position: rows.length + 1,
      track,
      start,
      end,
      startOverridden: override?.start !== undefined,
      endOverridden: override?.end !== undefined,
      inverted: end.seconds < start.seconds,
      effectiveSeconds: Math.max(0, end.seconds - start.seconds),
    });
  }
  return rows;
}

export function summarizeSet(rows: SetTrackRow[]): SetSummary {
  const totalSeconds = rows.reduce((sum, r) => sum + r.effectiveSeconds, 0);
  return {
    trackCount: rows.length,
    totalSeconds,
    averageSeconds: rows.length > 0 ? totalSeconds / rows.length : 0,
  };
}
