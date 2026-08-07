/** Payload bruto devolvido pelo comando Tauri read_rekordbox_sqlite. */
export interface SqliteTrackPayload {
  id: string;
  title: string;
  artist: string;
  bpm: number | null;
  key: string | null;
  totalTimeSeconds: number;
  hotCueASeconds: number | null;
  hotCueBSeconds: number | null;
}

export interface SqlitePlaylistPayload {
  id: string;
  name: string;
  folderPath: string[];
  trackIds: string[];
}

export interface SqliteLibraryPayload {
  tracks: SqliteTrackPayload[];
  playlists: SqlitePlaylistPayload[];
}

/**
 * Códigos de erro estáveis devolvidos pelo lado Rust (ver sqlite_source.rs):
 * - DB_NOT_FOUND: master.db não existe no caminho esperado.
 * - DECRYPT_FAILED: a chave SQLCipher (padrão ou informada) não decodificou o
 *   arquivo — ver as premissas documentadas no cabeçalho de sqlite_source.rs.
 * - SCHEMA_ERROR: decodificou, mas uma tabela/coluna esperada não bateu.
 * - UNKNOWN: qualquer outra falha (permissão, I/O, etc.).
 */
export type SqliteErrorCode =
  | "DB_NOT_FOUND"
  | "DECRYPT_FAILED"
  | "SCHEMA_ERROR"
  | "UNKNOWN";
