import { Database, FileCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KeyForm } from "@/components/KeyForm";
import type { LibrarySource, SourceFailure } from "@/types/librarySource";

interface SourceBarProps {
  source: LibrarySource;
  failure: SourceFailure | null;
  busy: boolean;
  onPickSqlite: () => void;
  onPickXml: () => void;
  onRetryWithKey: (key: string) => Promise<boolean>;
  onDismissFailure: () => void;
}

function describe(source: LibrarySource): { label: string; detail: string } {
  if (source.kind === "xml") {
    return { label: "XML exportado", detail: source.path };
  }
  return {
    label: "Banco (tempo real)",
    detail: source.path ?? "caminho padrão (AppData)",
  };
}

/** Barra com a fonte ativa e atalhos para trocar de master.db / XML. */
export function SourceBar({
  source,
  failure,
  busy,
  onPickSqlite,
  onPickXml,
  onRetryWithKey,
  onDismissFailure,
}: SourceBarProps) {
  const { label, detail } = describe(source);
  const Icon = source.kind === "sqlite" ? Database : FileCode;

  return (
    <div className="border-b border-line bg-surface-raised">
      <div className="flex items-center justify-between gap-3 px-5 py-2">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <Icon className="h-3.5 w-3.5 shrink-0 text-wave" aria-hidden />
          <span className="shrink-0 font-medium text-wave">{label}</span>
          <span className="truncate text-ink-faint" title={detail}>
            {detail}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPickSqlite} disabled={busy}>
            Trocar master.db…
          </Button>
          <Button variant="outline" size="sm" onClick={onPickXml} disabled={busy}>
            Usar XML…
          </Button>
        </div>
      </div>

      {failure && (
        <div className="border-t border-line px-5 py-3">
          <div className="mb-2 flex items-start justify-between gap-3">
            <p className="text-xs text-alert">{failure.message}</p>
            <button
              type="button"
              onClick={onDismissFailure}
              aria-label="Dispensar aviso"
              className="rounded p-0.5 text-ink-faint hover:text-ink"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
          {failure.code === "DECRYPT_FAILED" && (
            <KeyForm disabled={busy} onSubmit={onRetryWithKey} />
          )}
        </div>
      )}
    </div>
  );
}
