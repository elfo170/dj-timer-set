import { useMemo, useState } from "react";
import { Disc3, ListMusic, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import type { RekordboxPlaylist } from "@/types/rekordbox";

interface PlaylistSidebarProps {
  playlists: RekordboxPlaylist[];
  selectedId: string | null;
  onSelect: (playlistId: string) => void;
}

export function PlaylistSidebar({
  playlists,
  selectedId,
  onSelect,
}: PlaylistSidebarProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return playlists;
    return playlists.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.folderPath.join("/").toLowerCase().includes(term),
    );
  }, [playlists, query]);

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-line bg-surface-raised">
      <div className="flex items-center gap-2 px-4 pb-3 pt-4">
        <Disc3 className="h-5 w-5 text-wave" aria-hidden />
        <h1 className="text-sm font-semibold tracking-wide text-ink">
          DJ Set Timer
        </h1>
      </div>

      <div className="px-3 pb-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar playlist"
            className="pl-9"
            aria-label="Buscar playlist"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4" aria-label="Playlists">
        {filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-ink-faint">
            Nenhuma playlist encontrada.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((playlist) => {
              const selected = playlist.id === selectedId;
              return (
                <li key={playlist.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(playlist.id)}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-md px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wave/50",
                      selected
                        ? "bg-wave/15 text-wave"
                        : "text-ink-muted hover:bg-surface-overlay hover:text-ink",
                    )}
                  >
                    <ListMusic className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {playlist.name}
                      </span>
                      <span className="block truncate text-[11px] text-ink-faint">
                        {playlist.folderPath.length > 0
                          ? playlist.folderPath.join(" / ")
                          : "Raiz"}
                        {" · "}
                        {playlist.trackIds.length}{" "}
                        {playlist.trackIds.length === 1 ? "música" : "músicas"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </aside>
  );
}
