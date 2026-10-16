import type { PlaylistCueSettings, TrackCueOverride } from "@/types/cues";
import type { RekordboxPlaylist } from "@/types/rekordbox";
import { createDefaultSettings, isCueRef } from "@/utils/cues";

const STORAGE_KEY = "djSetTimer.cueSettings.v1";

/** Configurações de todas as playlists, indexadas por `playlistSettingsKey`. */
export type CueSettingsStore = Record<string, PlaylistCueSettings>;

/**
 * Chave estável da playlist: caminho de pastas + nome. Não usa o id porque no
 * XML ele é sequencial (muda ao criar/remover playlists); assim a configuração
 * também sobrevive à troca de fonte (master.db ↔ XML).
 */
export function playlistSettingsKey(
  playlist: Pick<RekordboxPlaylist, "folderPath" | "name">,
): string {
  return [...playlist.folderPath, playlist.name].join(" / ");
}

function sanitize(value: unknown): PlaylistCueSettings | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const defaults = createDefaultSettings();

  const overrides: Record<string, TrackCueOverride> = {};
  if (typeof raw.overrides === "object" && raw.overrides !== null) {
    for (const [trackId, entryRaw] of Object.entries(raw.overrides)) {
      if (typeof entryRaw !== "object" || entryRaw === null) continue;
      const entry = entryRaw as Record<string, unknown>;
      const override: TrackCueOverride = {};
      if (isCueRef(entry.start)) override.start = entry.start;
      if (isCueRef(entry.end)) override.end = entry.end;
      if (override.start !== undefined || override.end !== undefined) {
        overrides[trackId] = override;
      }
    }
  }

  return {
    start: isCueRef(raw.start) ? raw.start : defaults.start,
    end: isCueRef(raw.end) ? raw.end : defaults.end,
    overrides,
  };
}

export function loadCueSettingsStore(): CueSettingsStore {
  try {
    const text = window.localStorage.getItem(STORAGE_KEY);
    if (!text) return {};
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    const store: CueSettingsStore = {};
    for (const [key, value] of Object.entries(parsed)) {
      const settings = sanitize(value);
      if (settings) store[key] = settings;
    }
    return store;
  } catch {
    return {}; // dado corrompido ou storage indisponível → começa do padrão
  }
}

export function saveCueSettingsStore(store: CueSettingsStore): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Sem persistência: a configuração vale só até fechar o app.
  }
}
