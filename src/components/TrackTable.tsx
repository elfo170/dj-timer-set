import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMinutesSeconds } from "@/utils/time";
import type { SetTrackRow } from "@/types/rekordbox";

interface TrackTableProps {
  rows: SetTrackRow[];
}

export function TrackTable({ rows }: TrackTableProps) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-ink-faint">Esta playlist está vazia.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-surface-raised">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-12 text-right">#</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Artista</TableHead>
            <TableHead className="w-20 text-right">BPM</TableHead>
            <TableHead className="w-16">Key</TableHead>
            <TableHead className="w-24 text-right">
              <span className="text-cueA">Hot Cue A</span>
            </TableHead>
            <TableHead className="w-24 text-right">
              <span className="text-cueB">Hot Cue B</span>
            </TableHead>
            <TableHead className="w-24 text-right">Tempo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ position, track, effectiveSeconds }) => (
            <TableRow key={`${position}-${track.id}`}>
              <TableCell className="text-right font-mono text-xs text-ink-faint">
                {position}
              </TableCell>
              <TableCell className="max-w-64 truncate font-medium text-ink">
                {track.title}
              </TableCell>
              <TableCell className="max-w-48 truncate text-ink-muted">
                {track.artist || "—"}
              </TableCell>
              <TableCell className="text-right font-mono text-ink-muted">
                {track.bpm !== null ? track.bpm.toFixed(1) : "—"}
              </TableCell>
              <TableCell className="font-mono text-ink-muted">
                {track.key ?? "—"}
              </TableCell>
              <TableCell className="text-right font-mono text-cueA">
                {track.hotCueASeconds !== null
                  ? formatMinutesSeconds(track.hotCueASeconds)
                  : "—"}
              </TableCell>
              <TableCell className="text-right font-mono text-cueB">
                {track.hotCueBSeconds !== null
                  ? formatMinutesSeconds(track.hotCueBSeconds)
                  : "—"}
              </TableCell>
              <TableCell className="text-right font-mono font-semibold text-wave">
                {formatMinutesSeconds(effectiveSeconds)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
