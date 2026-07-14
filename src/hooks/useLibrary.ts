import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createLibraryProvider,
  LibraryNotFoundError,
} from "@/services/libraryService";
import type { RekordboxLibrary } from "@/types/rekordbox";

export type LibraryStatus = "loading" | "ready" | "not-found" | "error";

export interface UseLibraryResult {
  status: LibraryStatus;
  library: RekordboxLibrary | null;
  errorMessage: string | null;
  /** Relê o rekordbox.xml do disco (botão Recarregar). */
  reload: () => void;
  /** Momento da última leitura bem-sucedida. */
  loadedAt: Date | null;
}

export function useLibrary(): UseLibraryResult {
  const provider = useMemo(() => createLibraryProvider(), []);
  const [status, setStatus] = useState<LibraryStatus>("loading");
  const [library, setLibrary] = useState<RekordboxLibrary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const reload = useCallback(() => {
    let cancelled = false;
    setStatus("loading");
    setErrorMessage(null);

    provider
      .loadLibrary()
      .then((loaded) => {
        if (cancelled) return;
        setLibrary(loaded);
        setLoadedAt(new Date());
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof LibraryNotFoundError) {
          setStatus("not-found");
          setErrorMessage(error.message);
        } else {
          setStatus("error");
          setErrorMessage(
            error instanceof Error ? error.message : String(error),
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [provider]);

  useEffect(() => {
    // Carrega automaticamente ao abrir o aplicativo.
    const cancel = reload();
    return cancel;
  }, [reload]);

  return { status, library, errorMessage, reload, loadedAt };
}
