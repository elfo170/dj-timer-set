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
  /** Posição do Hot Cue A em segundos (null quando não existe). */
  hotCueASeconds: number | null;
  /** Posição do Hot Cue B em segundos (null quando não existe). */
  hotCueBSeconds: number | null;
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
  /** Tempo efetivo (HCB − HCA) em segundos. */
  effectiveSeconds: number;
}

/** Resumo agregado de um set. */
export interface SetSummary {
  trackCount: number;
  totalSeconds: number;
  averageSeconds: number;
}
