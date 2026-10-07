import { useEffect, useMemo, useState } from "react";
import { FileWarning, ListMusic, LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlaylistSidebar } from "@/components/PlaylistSidebar";
import { TrackTable } from "@/components/TrackTable";
import { SourceBar } from "@/components/SourceBar";
import {
  GOAL_OPTIONS_MINUTES,
  SetSummaryPanel,
  type GoalMinutes,
} from "@/components/SetSummaryPanel";
import { useLibrary } from "@/hooks/useLibrary";
import { buildSetRows, summarizeSet } from "@/utils/setMath";

const DEFAULT_GOAL: GoalMinutes = GOAL_OPTIONS_MINUTES[2]; // 60 min

export function HomePage() {
  const {
    status,
    library,
    source,
    errorMessage,
    sqliteFallbackReason,
    reload,
    switchSource,
    retryWithKey,
    loadedAt,
  } = useLibrary();
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [goalMinutes, setGoalMinutes] = useState<GoalMinutes>(DEFAULT_GOAL);

  // Mantém uma playlist selecionada válida após carregar/recarregar/trocar de fonte.
  useEffect(() => {
    if (!library) return;
    const stillExists = library.playlists.some((p) => p.id === selectedPlaylistId);
    if (!stillExists) {
      setSelectedPlaylistId(library.playlists[0]?.id ?? null);
    }
  }, [library, selectedPlaylistId]);

  const selectedPlaylist = useMemo(
    () =>
      library?.playlists.find((p) => p.id === selectedPlaylistId) ?? null,
    [library, selectedPlaylistId],
  );

  const rows = useMemo(
    () =>
      library && selectedPlaylist ? buildSetRows(selectedPlaylist, library) : [],
    [library, selectedPlaylist],
  );

  const summary = useMemo(() => summarizeSet(rows), [rows]);

  if (status === "loading") {
    return (
      <CenteredState>
        <LoaderCircle className="h-8 w-8 animate-spin text-wave motion-reduce:animate-none" aria-hidden />
        <p className="text-sm text-ink-muted">Lendo a biblioteca do Rekordbox…</p>
      </CenteredState>
    );
  }

  if (status === "not-found" || status === "error") {
    return (
      <CenteredState>
        <FileWarning className="h-10 w-10 text-alert" aria-hidden />
        <h2 className="text-base font-semibold text-ink">
          {status === "not-found"
            ? "Biblioteca do Rekordbox não encontrada"
            : "Não foi possível ler a biblioteca"}
        </h2>
        <p className="max-w-md text-center text-sm text-ink-muted">{errorMessage}</p>
        <Button onClick={reload}>
          <RefreshCw className="h-4 w-4" aria-hidden />
          Tentar novamente
        </Button>
      </CenteredState>
    );
  }

  return (
    <div className="flex h-screen bg-surface text-ink">
      <PlaylistSidebar
        playlists={library?.playlists ?? []}
        selectedId={selectedPlaylistId}
        onSelect={setSelectedPlaylistId}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <SourceBar
          source={source}
          sqliteFallbackReason={sqliteFallbackReason}
          onSwitchSource={switchSource}
          onRetryWithKey={retryWithKey}
        />

        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-ink">
              {selectedPlaylist?.name ?? "Selecione uma playlist"}
            </h2>
            {loadedAt && (
              <p className="text-[11px] text-ink-faint">
                Biblioteca lida às {loadedAt.toLocaleTimeString("pt-BR")}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={reload}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Recarregar
          </Button>
        </header>

        {selectedPlaylist ? (
          <>
            <TrackTable rows={rows} />
            <SetSummaryPanel
              summary={summary}
              goalMinutes={goalMinutes}
              onGoalChange={setGoalMinutes}
            />
          </>
        ) : (
          <CenteredState>
            <ListMusic className="h-10 w-10 text-ink-faint" aria-hidden />
            <p className="text-sm text-ink-muted">
              Escolha uma playlist na barra lateral para calcular o set.
            </p>
          </CenteredState>
        )}
      </main>
    </div>
  );
}

function CenteredState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-1 flex-col items-center justify-center gap-3 bg-surface p-8">
      {children}
    </div>
  );
}
