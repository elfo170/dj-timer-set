import type {
  CueRef,
  CueRole,
  PlaylistCueSettings,
  ResolvedCue,
} from "@/types/cues";
import type { RekordboxTrack } from "@/types/rekordbox";

/** Padrão histórico do app: início no Hot Cue A, fim no Hot Cue B. */
export const DEFAULT_START_REF: CueRef = "hc:0";
export const DEFAULT_END_REF: CueRef = "hc:1";

/** Maior índice de hot cue suportado (25 = Z). */
export const MAX_HOT_CUE_INDEX = 25;

export function createDefaultSettings(): PlaylistCueSettings {
  return { start: DEFAULT_START_REF, end: DEFAULT_END_REF, overrides: {} };
}

export function isDefaultGlobal(settings: PlaylistCueSettings): boolean {
  return settings.start === DEFAULT_START_REF && settings.end === DEFAULT_END_REF;
}

const CUE_REF_PATTERN = /^(?:track-start|track-end|hc:(?:\d|1\d|2[0-5]))$/;

export function isCueRef(value: unknown): value is CueRef {
  return typeof value === "string" && CUE_REF_PATTERN.test(value);
}

export function hotCueRef(index: number): CueRef {
  return `hc:${index}`;
}

export function hotCueIndexOf(ref: CueRef): number | null {
  return ref.startsWith("hc:") ? Number(ref.slice(3)) : null;
}

/** Rótulo curto: "Início", "Fim" ou a letra do hot cue ("A", "B"…). */
export function shortCueLabel(ref: CueRef): string {
  if (ref === "track-start") return "Início";
  if (ref === "track-end") return "Fim";
  return String.fromCharCode(65 + Number(ref.slice(3)));
}

/** Rótulo completo para listas de seleção. */
export function cueOptionLabel(ref: CueRef): string {
  if (ref === "track-start") return "Início da faixa";
  if (ref === "track-end") return "Fim da faixa";
  return `Hot Cue ${shortCueLabel(ref)}`;
}

/**
 * Resolve um ponto de corte para uma faixa. Se o hot cue escolhido não existe
 * na faixa, cai no início (papel "start") ou no fim (papel "end") da faixa —
 * a mesma regra que o app sempre usou para Hot Cue A/B ausentes.
 */
export function resolveCue(
  track: RekordboxTrack,
  ref: CueRef,
  role: CueRole,
): ResolvedCue {
  if (ref === "track-start") return { ref, seconds: 0, fallback: false };
  if (ref === "track-end") {
    return { ref, seconds: track.totalTimeSeconds, fallback: false };
  }
  const index = hotCueIndexOf(ref);
  const cue = track.hotCues.find((c) => c.index === index);
  if (cue) return { ref, seconds: cue.seconds, fallback: false };
  return {
    ref,
    seconds: role === "start" ? 0 : track.totalTimeSeconds,
    fallback: true,
  };
}

/** Posição (em segundos) do ponto na faixa, ou null se o hot cue não existe nela. */
export function cueSecondsOf(track: RekordboxTrack, ref: CueRef): number | null {
  if (ref === "track-start") return 0;
  if (ref === "track-end") return track.totalTimeSeconds;
  const index = hotCueIndexOf(ref);
  return track.hotCues.find((cue) => cue.index === index)?.seconds ?? null;
}

export interface CueOption {
  value: CueRef;
  label: string;
}

/**
 * Opções de um seletor de ponto de corte. "start" oferece o início da faixa +
 * hot cues; "end" oferece hot cues + o fim da faixa. `extra` garante que um
 * valor já escolhido apareça mesmo que o hot cue não exista (marcado como ausente).
 */
export function buildCueOptions(
  role: CueRole,
  hotCueIndexes: number[],
  extra?: CueRef,
): CueOption[] {
  const refs: CueRef[] = [];
  if (role === "start") refs.push("track-start");
  for (const index of [...new Set(hotCueIndexes)].sort((a, b) => a - b)) {
    refs.push(hotCueRef(index));
  }
  if (role === "end") refs.push("track-end");

  const options: CueOption[] = refs.map((ref) => ({
    value: ref,
    label: cueOptionLabel(ref),
  }));
  if (extra && !refs.includes(extra)) {
    options.push({ value: extra, label: `${cueOptionLabel(extra)} — ausente` });
  }
  return options;
}

/** Índices de hot cue presentes nas faixas (sempre inclui A e B). */
export function collectHotCueIndexes(tracks: RekordboxTrack[]): number[] {
  const indexes = new Set<number>([0, 1]);
  for (const track of tracks) {
    for (const cue of track.hotCues) indexes.add(cue.index);
  }
  return [...indexes].sort((a, b) => a - b);
}
