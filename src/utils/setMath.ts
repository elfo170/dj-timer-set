import type {
  RekordboxLibrary,
  RekordboxPlaylist,
  RekordboxTrack,
  SetSummary,
  SetTrackRow,
} from "@/types/rekordbox";

/**
 * Tempo efetivo de uma faixa dentro do set:
 *   tempo = Hot Cue B − Hot Cue A
 * Sem Hot Cue A → considera 00:00.
 * Sem Hot Cue B → considera a duração total da música.
 */
export function effectiveTrackSeconds(track: RekordboxTrack): number {
  const start = track.hotCueASeconds ?? 0;
  const end = track.hotCueBSeconds ?? track.totalTimeSeconds;
  return Math.max(0, end - start);
}

/** Monta as linhas do set respeitando exatamente a ordem da playlist. */
export function buildSetRows(
  playlist: RekordboxPlaylist,
  library: RekordboxLibrary,
): SetTrackRow[] {
  const rows: SetTrackRow[] = [];
  for (const trackId of playlist.trackIds) {
    const track = library.tracks.get(trackId);
    if (!track) continue; // referência órfã no XML
    rows.push({
      position: rows.length + 1,
      track,
      effectiveSeconds: effectiveTrackSeconds(track),
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
