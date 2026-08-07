import { invoke } from "@tauri-apps/api/core";
import type { LibraryProvider } from "@/services/libraryService";
import type { RekordboxLibrary, RekordboxTrack } from "@/types/rekordbox";
import type { SqliteErrorCode, SqliteLibraryPayload } from "@/types/sqliteSource";

/**
 * Erro de leitura do master.db, com o código estável vindo do Rust já
 * classificado — a UI decide o que mostrar (e se vale a pena tentar o XML
 * como alternativa) a partir de `code`, não da mensagem em si.
 */
export class SqliteReadError extends Error {
  constructor(
    public readonly code: SqliteErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SqliteReadError";
  }
}

function classify(raw: string): SqliteReadError {
  if (raw === "DB_NOT_FOUND") {
    return new SqliteReadError(
      "DB_NOT_FOUND",
      "O master.db do Rekordbox não foi encontrado na mesma pasta do rekordbox.xml.",
    );
  }
  if (raw === "DECRYPT_FAILED") {
    return new SqliteReadError(
      "DECRYPT_FAILED",
      "Não foi possível decodificar o master.db com a chave atual.",
    );
  }
  if (raw.startsWith("SCHEMA_ERROR")) {
    return new SqliteReadError(
      "SCHEMA_ERROR",
      "O master.db foi decodificado, mas a estrutura das tabelas não bateu com o esperado.",
    );
  }
  return new SqliteReadError("UNKNOWN", `Erro inesperado ao ler o master.db: ${raw}`);
}

/**
 * Lê a biblioteca diretamente do master.db (SQLCipher), sem depender de
 * exportação manual do XML. Ver as premissas não validadas no cabeçalho de
 * src-tauri/src/sqlite_source.rs antes de confiar cegamente no resultado.
 */
export class SqliteLibraryProvider implements LibraryProvider {
  constructor(private readonly keyOverride?: string) {}

  async loadLibrary(): Promise<RekordboxLibrary> {
    let payload: SqliteLibraryPayload;
    try {
      payload = await invoke<SqliteLibraryPayload>("read_rekordbox_sqlite", {
        keyOverride: this.keyOverride ?? null,
      });
    } catch (error) {
      throw classify(typeof error === "string" ? error : String(error));
    }

    const tracks = new Map<string, RekordboxTrack>();
    for (const t of payload.tracks) {
      tracks.set(t.id, t);
    }

    return { tracks, playlists: payload.playlists };
  }
}

/** Salva a chave para reuso automático nas próximas leituras. */
export async function saveSqlcipherKey(key: string): Promise<void> {
  await invoke("save_sqlcipher_key", { key });
}

/** Remove a chave salva, voltando a usar a chave padrão embutida no app. */
export async function clearSqlcipherKey(): Promise<void> {
  await invoke("clear_sqlcipher_key");
}
