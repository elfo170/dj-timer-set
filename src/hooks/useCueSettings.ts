import { useCallback, useMemo, useState } from "react";
import {
  loadCueSettingsStore,
  playlistSettingsKey,
  saveCueSettingsStore,
  type CueSettingsStore,
} from "@/services/cueSettingsStore";
import type { CueRef, CueRole, PlaylistCueSettings } from "@/types/cues";
import type { RekordboxPlaylist } from "@/types/rekordbox";
import { createDefaultSettings } from "@/utils/cues";

export interface UseCueSettingsResult {
  settings: PlaylistCueSettings;
  /** Define o ponto inicial/final padrão da playlist inteira. */
  setGlobalCue: (role: CueRole, ref: CueRef) => void;
  /** Define o ponto de uma faixa; `null` remove a exceção (volta ao padrão da playlist). */
  setTrackCue: (trackId: string, role: CueRole, ref: CueRef | null) => void;
  /** Volta a playlist ao padrão de fábrica (A → B) e remove todas as exceções. */
  resetPlaylist: () => void;
}

/** Configuração do cálculo da playlist selecionada, persistida entre sessões. */
export function useCueSettings(
  playlist: RekordboxPlaylist | null,
): UseCueSettingsResult {
  const [store, setStore] = useState<CueSettingsStore>(loadCueSettingsStore);
  const key = playlist ? playlistSettingsKey(playlist) : null;

  const settings = useMemo(
    () => (key !== null ? store[key] : undefined) ?? createDefaultSettings(),
    [key, store],
  );

  const update = useCallback(
    (change: (current: PlaylistCueSettings) => PlaylistCueSettings) => {
      if (key === null) return;
      setStore((previous) => {
        const next = {
          ...previous,
          [key]: change(previous[key] ?? createDefaultSettings()),
        };
        saveCueSettingsStore(next);
        return next;
      });
    },
    [key],
  );

  const setGlobalCue = useCallback(
    (role: CueRole, ref: CueRef) => update((current) => ({ ...current, [role]: ref })),
    [update],
  );

  const setTrackCue = useCallback(
    (trackId: string, role: CueRole, ref: CueRef | null) =>
      update((current) => {
        const overrides = { ...current.overrides };
        const entry = { ...overrides[trackId] };
        if (ref === null) delete entry[role];
        else entry[role] = ref;

        if (entry.start === undefined && entry.end === undefined) {
          delete overrides[trackId];
        } else {
          overrides[trackId] = entry;
        }
        return { ...current, overrides };
      }),
    [update],
  );

  const resetPlaylist = useCallback(
    () => update(() => createDefaultSettings()),
    [update],
  );

  return { settings, setGlobalCue, setTrackCue, resetPlaylist };
}
