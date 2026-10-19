/**
 * Referência a um ponto de corte do cálculo, serializável como texto simples
 * (usada como valor de <select> e no localStorage):
 *   "track-start" → início da faixa (00:00)
 *   "track-end"   → fim da faixa (duração total)
 *   "hc:N"        → hot cue de índice N (0 = A, 1 = B, 2 = C…)
 */
export type CueRef = "track-start" | "track-end" | `hc:${number}`;

export type CueRole = "start" | "end";

/** Ponto de corte já resolvido para uma faixa específica. */
export interface ResolvedCue {
  ref: CueRef;
  seconds: number;
  /**
   * true quando o hot cue escolhido não existe na faixa e o cálculo caiu no
   * início (para "início") ou no fim (para "fim") da faixa.
   */
  fallback: boolean;
}

/** Pontos personalizados de uma faixa (ausente = segue o padrão da playlist). */
export interface TrackCueOverride {
  start?: CueRef;
  end?: CueRef;
}

/** Configuração do cálculo de uma playlist. */
export interface PlaylistCueSettings {
  /** Padrão da playlist inteira. */
  start: CueRef;
  end: CueRef;
  /** Exceções por faixa, indexadas pelo id da faixa. */
  overrides: Record<string, TrackCueOverride>;
}
