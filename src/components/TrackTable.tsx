import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CueSelect, type CueSelectOption } from "@/components/CueSelect";
import { formatMinutesSeconds } from "@/utils/time";
import { cn } from "@/utils/cn";
import {
  buildCueOptions,
  cueOptionLabel,
  isCueRef,
  shortCueLabel,
} from "@/utils/cues";
import type { CueRef, CueRole, PlaylistCueSettings } from "@/types/cues";
import type { SetTrackRow } from "@/types/rekordbox";

interface TrackTableProps {
  rows: SetTrackRow[];
  settings: PlaylistCueSettings;
  onChangeTrackCue: (trackId: string, role: CueRole, ref: CueRef | null) => void;
}

export function TrackTable({ rows, settings, onChangeTrackCue }: TrackTableProps) {
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
            <TableHead className="w-48 text-right">
              <span className="text-cueA">Início</span>
            </TableHead>
            <TableHead className="w-48 text-right">
              <span className="text-cueB">Fim</span>
            </TableHead>
            <TableHead className="w-24 text-right">Tempo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const { position, track, effectiveSeconds } = row;
            return (
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
                <TableCell className="text-right">
                  <CueCell
                    role="start"
                    row={row}
                    defaultRef={settings.start}
                    onChange={(ref) => onChangeTrackCue(track.id, "start", ref)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <CueCell
                    role="end"
                    row={row}
                    defaultRef={settings.end}
                    onChange={(ref) => onChangeTrackCue(track.id, "end", ref)}
                  />
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-mono font-semibold",
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
  /** Ponto padrão da playlist para este papel. */
  defaultRef: CueRef;
  /** `null` = voltar ao padrão da playlist. */
  onChange: (ref: CueRef | null) => void;
}

/** Seletor do ponto da faixa + o tempo resultante. */
function CueCell({ role, row, defaultRef, onChange }: CueCellProps) {
  const resolved = role === "start" ? row.start : row.end;
  const overridden = role === "start" ? row.startOverridden : row.endOverridden;

  const trackIndexes = row.track.hotCues.map((cue) => cue.index);
  const defaultMissing = !overridden && resolved.fallback;
  const defaultLabel = `Padrão (${shortCueLabel(defaultRef)}${defaultMissing ? " — ausente" : ""})`;

  const options: CueSelectOption[] = [
    { value: "", label: defaultLabel },
    ...buildCueOptions(role, trackIndexes, overridden ? resolved.ref : undefined),
  ];

  return (
    <div className="flex items-center justify-end gap-2">
      <CueSelect
        tone={role}
        highlighted={overridden}
        label={`${role === "start" ? "Ponto inicial" : "Ponto final"} de ${row.track.title}`}
        value={overridden ? resolved.ref : ""}
        options={options}
        onChange={(value) => onChange(isCueRef(value) ? value : null)}
        className="w-32"
      />
      <span
        className={cn(
          "w-12 text-right font-mono text-xs",
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
