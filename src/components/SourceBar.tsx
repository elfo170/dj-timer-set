import { useState } from "react";
import { Database, FileCode, KeyRound, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import type { LibrarySource } from "@/hooks/useLibrary";
import type { SqliteReadError } from "@/services/sqliteLibraryProvider";

interface SourceBarProps {
  source: LibrarySource;
  sqliteFallbackReason: SqliteReadError | null;
  onSwitchSource: (source: LibrarySource) => void;
  onRetryWithKey: (key: string) => Promise<boolean>;
}

export function SourceBar({
  source,
  sqliteFallbackReason,
  onSwitchSource,
  onRetryWithKey,
}: SourceBarProps) {
  const [keyFormOpen, setKeyFormOpen] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attemptFailed, setAttemptFailed] = useState(false);

  const handleSubmitKey = async () => {
    if (!keyInput.trim()) return;
    setSubmitting(true);
    setAttemptFailed(false);
    const ok = await onRetryWithKey(keyInput.trim());
    setSubmitting(false);
    if (ok) {
      setKeyFormOpen(false);
      setKeyInput("");
    } else {
      setAttemptFailed(true);
    }
  };

  return (
    <div className="border-b border-line bg-surface-raised">
      <div className="flex items-center justify-between gap-3 px-5 py-2">
        <div
          className="flex items-center gap-1 rounded-md border border-line p-0.5"
          role="group"
          aria-label="Fonte dos dados"
        >
          <SourceButton
            active={source === "sqlite"}
            icon={<Database className="h-3.5 w-3.5" aria-hidden />}
            label="Banco (tempo real)"
            onClick={() => onSwitchSource("sqlite")}
          />
          <SourceButton
            active={source === "xml"}
            icon={<FileCode className="h-3.5 w-3.5" aria-hidden />}
            label="XML exportado"
            onClick={() => onSwitchSource("xml")}
          />
        </div>

        {source === "xml" && sqliteFallbackReason && (
          <button
            type="button"
            onClick={() => setKeyFormOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-alert/90 hover:bg-alert/10"
          >
            <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
            Banco indisponível — usando XML
          </button>
        )}
      </div>

      {keyFormOpen && (
        <div className="border-t border-line px-5 py-3">
          <p className="mb-2 text-xs text-ink-muted">
            {sqliteFallbackReason?.message}{" "}
            {sqliteFallbackReason?.code === "DECRYPT_FAILED" &&
              "Se você tiver a chave SQLCipher correta para esta instalação, informe-a abaixo."}
          </p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <KeyRound
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint"
                aria-hidden
              />
              <Input
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Chave SQLCipher (64 caracteres hex)"
                className="pl-8 font-mono text-xs"
                aria-label="Chave SQLCipher manual"
              />
            </div>
            <Button
              size="sm"
              onClick={handleSubmitKey}
              disabled={submitting || !keyInput.trim()}
            >
              {submitting ? "Testando…" : "Usar esta chave"}
            </Button>
          </div>
          {attemptFailed && (
            <p className="mt-2 text-xs text-alert">
              Essa chave também não decodificou o master.db.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SourceButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wave/50",
        active
          ? "bg-wave/15 text-wave"
          : "text-ink-muted hover:bg-surface-overlay hover:text-ink",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
