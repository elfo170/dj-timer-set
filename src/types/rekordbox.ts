import type { ResolvedCue } from "@/types/cues";

/** Hot cue de uma faixa: índice 0 = A, 1 = B, 2 = C… */
export interface HotCue {
  index: number;
  seconds: number;
}

/** Uma faixa da coleção do Rekordbox, já normalizada pelo parser. */
export interface RekordboxTrack {
  /** TrackID do XML (chave usada pelas playlists). */
  id: string;
  title: string;
  artist: string;
  /** BPM médio informado pelo Rekordbox (null quando ausente). */
  bpm: number | null;
  /** Tonalidade (Tonality) informada pelo Rekordbox. */
  key: string | null;
  /** Duração total da música, em segundos. */
  totalTimeSeconds: number;
  /**
   * Hot cues existentes na faixa, ordenados por índice (A, B, C…).
   * Memory cues não entram aqui.
   */
  hotCues: HotCue[];
}

/** Playlist do Rekordbox (nó folha na árvore de playlists). */
export interface RekordboxPlaylist {
  id: string;
  name: string;
  /** Caminho de pastas até a playlist, ex.: ["Sets", "2026"]. */
  folderPath: string[];
  /** IDs das faixas, na ordem exata definida no Rekordbox. */
  trackIds: string[];
}

/** Biblioteca completa carregada de uma fonte de dados. */
export interface RekordboxLibrary {
  tracks: Map<string, RekordboxTrack>;
  playlists: RekordboxPlaylist[];
}

/** Linha da tabela: faixa + tempo efetivo calculado. */
export interface SetTrackRow {
  position: number;
  track: RekordboxTrack;
  /** Ponto inicial / final efetivamente usados nesta faixa. */
  start: ResolvedCue;
  end: ResolvedCue;
  /** true quando o ponto vem de uma exceção da faixa (não do padrão da playlist). */
  startOverridden: boolean;
  endOverridden: boolean;
  /** true quando o ponto final está antes do inicial (tempo vira 0). */
  inverted: boolean;
  /** Tempo efetivo (ponto final − ponto inicial) em segundos, nunca negativo. */
  effectiveSeconds: number;
}

/** Resumo agregado de um set. */
export interface SetSummary {
  trackCount: number;
  totalSeconds: number;
  averageSeconds: number;
}
