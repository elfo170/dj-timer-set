import { useCallback, useEffect, useRef, useState } from "react";
import { LibraryNotFoundError, XmlLibraryProvider } from "@/services/libraryService";
import { pickMasterDbPath, pickXmlPath } from "@/services/filePicker";
import { readSavedSource, writeSavedSource } from "@/services/savedSource";
import {
  SqliteLibraryProvider,
  SqliteReadError,
  saveSqlcipherKey,
} from "@/services/sqliteLibraryProvider";
import type { LibrarySource, SourceFailure } from "@/types/librarySource";
import type { RekordboxLibrary } from "@/types/rekordbox";

/**
 * - loading: tentando abrir uma fonte automaticamente
 * - ready: biblioteca carregada (`source` diz de onde)
 * - needs-source: nenhuma fonte automática funcionou; a UI pede ao usuário
 *   para escolher o master.db ou um XML
 */
export type LibraryStatus = "loading" | "ready" | "needs-source";

export interface UseLibraryResult {
  status: LibraryStatus;
  library: RekordboxLibrary | null;
  /** Fonte que produziu os dados exibidos (null enquanto nada foi carregado). */
  source: LibrarySource | null;
  /** Motivo da última tentativa que falhou (null se a última deu certo). */
  failure: SourceFailure | null;
  loadedAt: Date | null;
  /** true enquanto uma leitura está em andamento (desabilita os botões). */
  busy: boolean;
  /** Relê a fonte atual; sem fonte ativa, refaz a abertura automática. */
  reload: () => void;
  /** Abre o seletor de arquivo para escolher o master.db manualmente. */
  pickSqlite: () => Promise<void>;
  /** Abre o seletor de arquivo para escolher um XML manualmente. */
  pickXml: () => Promise<void>;
  /** Tenta o último master.db de novo com uma chave informada; salva se der certo. */
  retryWithKey: (key: string) => Promise<boolean>;
  dismissFailure: () => void;
}

function toFailure(error: unknown): SourceFailure {
  if (error instanceof SqliteReadError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof LibraryNotFoundError) {
    return { code: "XML_NOT_FOUND", message: error.message };
  }
  return {
    code: "UNKNOWN",
    message: error instanceof Error ? error.message : String(error),
  };
}

export function useLibrary(): UseLibraryResult {
  const [status, setStatus] = useState<LibraryStatus>("loading");
  const [library, setLibrary] = useState<RekordboxLibrary | null>(null);
  const [source, setSource] = useState<LibrarySource | null>(null);
  const [failure, setFailure] = useState<SourceFailure | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);

  // Evita que uma resposta atrasada de uma leitura anterior sobrescreva o
  // estado mais recente.
  const requestIdRef = useRef(0);
  // Qual master.db a última tentativa usou — é nele que "informar chave" age.
  const lastSqlitePathRef = useRef<string | null>(null);

  const tryLoad = useCallback(
    async (target: LibrarySource, keyOverride?: string): Promise<boolean> => {
      const requestId = ++requestIdRef.current;
      if (target.kind === "sqlite") {
        lastSqlitePathRef.current = target.path;
      }
      try {
        const lib =
          target.kind === "sqlite"
            ? await new SqliteLibraryProvider(target.path, keyOverride).loadLibrary()
            : await new XmlLibraryProvider(target.path).loadLibrary();
        if (requestId !== requestIdRef.current) return true;
        setLibrary(lib);
        setSource(target);
        setStatus("ready");
        setFailure(null);
        setLoadedAt(new Date());
        return true;
      } catch (error) {
        if (requestId !== requestIdRef.current) return false;
        setFailure(toFailure(error));
        return false;
      }
    },
    [],
  );

  // Ordem na abertura: 1) master.db no caminho padrão; 2) a última fonte que o
  // usuário escolheu manualmente (se houver); 3) pedir ao usuário.
  const autoLoad = useCallback(async () => {
    setBusy(true);
    setStatus("loading");
    setFailure(null);
    let ok = await tryLoad({ kind: "sqlite", path: null });
    if (!ok) {
      const saved = readSavedSource();
      if (saved) ok = await tryLoad(saved);
    }
    if (!ok) setStatus("needs-source");
    setBusy(false);
  }, [tryLoad]);

  useEffect(() => {
    void autoLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reload = useCallback(() => {
    if (!source) {
      void autoLoad();
      return;
    }
    setBusy(true);
    void tryLoad(source).finally(() => setBusy(false));
  }, [source, autoLoad, tryLoad]);

  const pickAndLoad = useCallback(
    async (kind: LibrarySource["kind"], pick: () => Promise<string | null>) => {
      const path = await pick();
      if (!path) return; // seletor cancelado
      setBusy(true);
      const target: LibrarySource = { kind, path };
      const ok = await tryLoad(target);
      if (ok) writeSavedSource(target);
      setBusy(false);
    },
    [tryLoad],
  );

  const pickSqlite = useCallback(
    () => pickAndLoad("sqlite", pickMasterDbPath),
    [pickAndLoad],
  );
  const pickXml = useCallback(() => pickAndLoad("xml", pickXmlPath), [pickAndLoad]);

  const retryWithKey = useCallback(
    async (key: string): Promise<boolean> => {
      setBusy(true);
      const path = lastSqlitePathRef.current;
      const ok = await tryLoad({ kind: "sqlite", path }, key);
      if (ok) {
        try {
          await saveSqlcipherKey(key);
        } catch {
          // A leitura já funcionou nesta sessão; falhar ao salvar só significa
          // que será preciso informar a chave de novo na próxima abertura.
        }
        if (path) writeSavedSource({ kind: "sqlite", path });
      }
      setBusy(false);
      return ok;
    },
    [tryLoad],
  );

  const dismissFailure = useCallback(() => setFailure(null), []);

  return {
    status,
    library,
    source,
    failure,
    loadedAt,
    busy,
    reload,
    pickSqlite,
    pickXml,
    retryWithKey,
    dismissFailure,
  };
}
