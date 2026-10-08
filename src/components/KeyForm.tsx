import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface KeyFormProps {
  disabled?: boolean;
  onSubmit: (key: string) => Promise<boolean>;
}

/** Campo para informar manualmente a chave SQLCipher quando a padrão não bate. */
export function KeyForm({ disabled, onSubmit }: KeyFormProps) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleSubmit = async () => {
    if (!value.trim()) return;
    setSubmitting(true);
    setFailed(false);
    const ok = await onSubmit(value.trim());
    setSubmitting(false);
    if (ok) {
      setValue("");
    } else {
      setFailed(true);
    }
  };

  return (
    <div>
      <p className="mb-2 text-xs text-ink-muted">
        Se você tiver a chave SQLCipher correta para esta instalação, informe-a abaixo.
      </p>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <KeyRound
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Chave SQLCipher (64 caracteres hex)"
            className="pl-8 font-mono text-xs"
            aria-label="Chave SQLCipher manual"
          />
        </div>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={disabled || submitting || !value.trim()}
        >
          {submitting ? "Testando…" : "Usar esta chave"}
        </Button>
      </div>
      {failed && (
        <p className="mt-2 text-xs text-alert">
          Essa chave também não decodificou o master.db.
        </p>
      )}
    </div>
  );
}
