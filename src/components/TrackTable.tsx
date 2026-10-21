import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CueChips } from "@/components/CueChips";
import { formatMinutesSeconds } from "@/utils/time";
import { cn } from "@/utils/cn";
import { cueOptionLabel } from "@/utils/cues";
import type { CueRef, CueRole, PlaylistCueSettings } from "@/types/cues";
import type { SetTrackRow } from "@/types/rekordbox";

interface TrackTableProps {
  rows: SetTrackRow[];
  settings: PlaylistCueSettings;
  onChangeTrackCue: (trackId: string, role: CueRole, ref: CueRef | null) => void;
}

/*
 * Layout sem rolagem lateral: tabela de colunas fixas (table-fixed) em que só o
 * Título absorve a sobra. Colunas secundárias somem conforme a janela estreita
 * (largura da JANELA, não do painel): BPM/Key abaixo de 1100px e Artista abaixo
 * de 1280px — este último passa a aparecer sob o título, então nada se perde.
 */
export function TrackTable({ rows, settings, onChangeTrackCue }: TrackTableProps) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-ink-faint">Esta playlist está vazia.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden">
      <Table className="table-fixed">
        <TableHeader className="sticky top-0 z-10 bg-surface-raised">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-9 px-2 text-right">#</TableHead>
            <TableHead className="px-2">Título</TableHead>
            <TableHead className="hidden w-[20%] px-2 min-[1280px]:table-cell">
              Artista
            </TableHead>
            <TableHead className="hidden w-16 px-2 text-right min-[1100px]:table-cell">
              BPM
            </TableHead>
            <TableHead className="hidden w-14 px-2 min-[1100px]:table-cell">Key</TableHead>
            <TableHead className="w-[11.5rem] px-2">
              <span className="text-cueA">Início</span>
            </TableHead>
            <TableHead className="w-[11.5rem] px-2">
              <span className="text-cueB">Fim</span>
            </TableHead>
            <TableHead className="w-[4.5rem] px-2 text-right">Tempo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const { position, track, effectiveSeconds } = row;
            return (
              <TableRow key={`${position}-${track.id}`}>
                <TableCell className="px-2 py-1.5 text-right font-mono text-xs text-ink-faint">
                  {position}
                </TableCell>
                <TableCell className="px-2 py-1.5">
                  <div className="truncate font-medium text-ink" title={track.title}>
                    {track.title}
                  </div>
                  <div className="truncate text-xs text-ink-muted min-[1280px]:hidden">
                    {track.artist || "—"}
                  </div>
                </TableCell>
                <TableCell className="hidden px-2 py-1.5 min-[1280px]:table-cell">
                  <div className="truncate text-ink-muted" title={track.artist}>
                    {track.artist || "—"}
                  </div>
                </TableCell>
                <TableCell className="hidden px-2 py-1.5 text-right font-mono text-ink-muted min-[1100px]:table-cell">
                  {track.bpm !== null ? track.bpm.toFixed(1) : "—"}
                </TableCell>
                <TableCell className="hidden px-2 py-1.5 font-mono text-ink-muted min-[1100px]:table-cell">
                  {track.key ?? "—"}
                </TableCell>
                <TableCell className="px-2 py-1.5">
                  <CueCell
                    role="start"
                    row={row}
                    defaultRef={settings.start}
                    onChange={(ref) => onChangeTrackCue(track.id, "start", ref)}
                  />
                </TableCell>
                <TableCell className="px-2 py-1.5">
                  <CueCell
                    role="end"
                    row={row}
                    defaultRef={settings.end}
                    onChange={(ref) => onChangeTrackCue(track.id, "end", ref)}
                  />
                </TableCell>
                <TableCell
                  className={cn(
                    "px-2 py-1.5 text-right font-mono font-semibold",
                    row.inverted ? "text-alert" : "text-wave",
                  )}
                  title={
                    row.inverted
                      ? "O ponto final está antes do inicial — tempo considerado 00:00"
                      : undefined
                  }
                >
                  {formatMinutesSeconds(effectiveSeconds)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

interface CueCellProps {
  role: CueRole;
  row: SetTrackRow;
  defaultRef: CueRef;
  onChange: (ref: CueRef | null) => void;
}

/** Chips de escolha do ponto + o tempo resultante. */
function CueCell({ role, row, defaultRef, onChange }: CueCellProps) {
  const resolved = role === "start" ? row.start : row.end;

  return (
    <div className="flex items-center justify-end gap-1.5">
      <CueChips
        role={role}
        row={row}
        defaultRef={defaultRef}
        onChange={onChange}
      />
      <span
        className={cn(
          "w-10 shrink-0 text-right font-mono text-xs",
          resolved.fallback
            ? "italic text-ink-faint"
            : role === "start"
              ? "text-cueA"
              : "text-cueB",
        )}
        title={
          resolved.fallback
            ? `${cueOptionLabel(resolved.ref)} não existe nesta faixa — usando ${role === "start" ? "o início" : "o fim"} da faixa`
            : undefined
        }
      >
        {formatMinutesSeconds(resolved.seconds)}
      </span>
    </div>
  );
}
