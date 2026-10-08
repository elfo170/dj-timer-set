import { Database, FileCode, FileWarning, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KeyForm } from "@/components/KeyForm";
import type { SourceFailure } from "@/types/librarySource";

interface SourcePickerProps {
  failure: SourceFailure | null;
  busy: boolean;
  onPickSqlite: () => void;
  onPickXml: () => void;
  onRetryDefault: () => void;
  onRetryWithKey: (key: string) => Promise<boolean>;
}

/**
 * Tela exibida quando o master.db no caminho padrão não pôde ser aberto e não
 * há fonte salva que funcione: o usuário escolhe o master.db ou um XML.
 */
export function SourcePicker({
  failure,
  busy,
  onPickSqlite,
  onPickXml,
  onRetryDefault,
  onRetryWithKey,
}: SourcePickerProps) {
  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-4 text-center">
      <FileWarning className="h-10 w-10 text-alert" aria-hidden />
      <h2 className="text-base font-semibold text-ink">
        Não consegui abrir a biblioteca do Rekordbox
      </h2>
      {failure && <p className="text-sm text-ink-muted">{failure.message}</p>}

      <div className="flex w-full flex-col gap-2">
        <Button onClick={onPickSqlite} disabled={busy}>
          <Database className="h-4 w-4" aria-hidden />
          Selecionar master.db…
        </Button>
        <Button variant="outline" onClick={onPickXml} disabled={busy}>
          <FileCode className="h-4 w-4" aria-hidden />
          Selecionar XML exportado…
        </Button>
      </div>
      <p className="text-xs text-ink-faint">
        O master.db reflete o Rekordbox em tempo real. O XML (File → Export Collection
        in xml format) só é necessário se você não conseguir abrir o banco.
      </p>

      {failure?.code === "DECRYPT_FAILED" && (
        <div className="w-full border-t border-line pt-4 text-left">
          <KeyForm disabled={busy} onSubmit={onRetryWithKey} />
        </div>
      )}

      <Button variant="outline" size="sm" onClick={onRetryDefault} disabled={busy}>
        <RefreshCw className="h-4 w-4" aria-hidden />
        Tentar o caminho padrão de novo
      </Button>
    </div>
  );
}
