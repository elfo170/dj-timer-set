import { useCallback, useEffect, useRef, useState } from "react";
import {
  createLibraryProvider,
  LibraryNotFoundError,
} from "@/services/libraryService";
import {
  SqliteLibraryProvider,
  SqliteReadError,
  saveSqlcipherKey,
} from "@/services/sqliteLibraryProvider";
import type { RekordboxLibrary } from "@/types/rekordbox";

export type LibraryStatus = "loading" | "ready" | "not-found" | "error";
export type LibrarySource = "sqlite" | "xml";

export interface UseLibraryResult {
  status: LibraryStatus;
  library: RekordboxLibrary | null;
  /** Fonte que efetivamente produziu os dados exibidos agora. */
  source: LibrarySource;
  /** Mensagem de erro da fonte ATIVA (mostrada nos estados not-found/error). */
  errorMessage: string | null;
  /**
   * Preenchido quando o SQLite falhou e o app caiu para o XML automaticamente
   * — a UI mostra um aviso mesmo com status "ready", já que os dados exibidos
   * não são "tempo real" como o usuário esperaria por padrão.
   */
  sqliteFallbackReason: SqliteReadError | null;
  reload: () => void;
  /** Troca manual de fonte (para comparar SQLite vs XML lado a lado). */
  switchSource: (source: LibrarySource) => void;
  /** Tenta o SQLite de novo com uma chave informada manualmente; salva se der certo. */
  retryWithKey: (key: string) => Promise<boolean>;
  loadedAt: Date | null;
}

export function useLibrary(): UseLibraryResult {
  const [status, setStatus] = useState<LibraryStatus>("loading");
  const [library, setLibrary] = useState<RekordboxLibrary | null>(null);
  const [source, setSource] = useState<LibrarySource>("sqlite");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sqliteFallbackReason, setSqliteFallbackReason] =
    useState<SqliteReadError | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  // Evita que uma resposta atrasada de uma leitura anterior (ex.: trocou de
  // fonte antes da primeira terminar) sobrescreva o estado mais recente.
  const requestIdRef = useRef(0);

  const loadXml = useCallback(async (): Promise<boolean> => {
    const requestId = ++requestIdRef.current;
    try {
      const lib = await createLibraryProvider().loadLibrary();
      if (requestId !== requestIdRef.current) return true;
      setLibrary(lib);
      setSource("xml");
      setStatus("ready");
      setErrorMessage(null);
      setLoadedAt(new Date());
      return true;
    } catch (error) {
      if (requestId !== requestIdRef.current) return false;
      setSource("xml");
      setStatus(error instanceof LibraryNotFoundError ? "not-found" : "error");
      setErrorMessage(error instanceof Error ? error.message : String(error));
      return false;
    }
  }, []);

  const loadSqlite = useCallback(async (keyOverride?: string): Promise<boolean> => {
    const requestId = ++requestIdRef.current;
    try {
      const lib = await new SqliteLibraryProvider(keyOverride).loadLibrary();
      if (requestId !== requestIdRef.current) return true;
      setLibrary(lib);
      setSource("sqlite");
      setStatus("ready");
      setErrorMessage(null);
      setSqliteFallbackReason(null);
      setLoadedAt(new Date());
      return true;
    } catch (error) {
      if (requestId !== requestIdRef.current) return false;
      if (error instanceof SqliteReadError) {
        setSqliteFallbackReason(error);
      }
      return false;
    }
  }, []);

  const autoLoad = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);
    const sqliteOk = await loadSqlite();
    if (!sqliteOk) {
      await loadXml();
    }
  }, [loadSqlite, loadXml]);

  useEffect(() => {
    void autoLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reload = useCallback(() => {
    if (source === "sqlite") {
      void loadSqlite().then((ok) => {
        if (!ok) void loadXml();
      });
    } else {
      void loadXml();
    }
  }, [source, loadSqlite, loadXml]);

  const switchSource = useCallback(
    (next: LibrarySource) => {
      if (next === "sqlite") {
        // Não muda `status`/`library` otimisticamente: se falhar, a tela
        // continua mostrando os dados da fonte anterior (XML) em vez de
        // sumir com a visão só porque o usuário testou o banco. O motivo
        // do erro fica em `sqliteFallbackReason`, exibido pela SourceBar.
        void loadSqlite();
      } else {
        void loadXml();
      }
    },
    [loadSqlite, loadXml],
  );

  const retryWithKey = useCallback(
    async (key: string): Promise<boolean> => {
      const ok = await loadSqlite(key);
      if (ok) {
        try {
          await saveSqlcipherKey(key);
        } catch {
          // Leitura já funcionou nesta sessão; falha ao salvar só significa
          // que será preciso informar a chave de novo na próxima abertura.
        }
      }
      return ok;
    },
    [loadSqlite],
  );

  return {
    status,
    library,
    source,
    errorMessage,
    sqliteFallbackReason,
    reload,
    switchSource,
    retryWithKey,
    loadedAt,
  };
}
