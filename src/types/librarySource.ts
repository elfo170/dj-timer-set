import type { SqliteErrorCode } from "@/types/sqliteSource";

/**
 * Fonte de onde a biblioteca foi (ou será) lida.
 * - sqlite com `path: null` = caminho padrão (%APPDATA%\Pioneer\rekordbox\master.db),
 *   resolvido pelo lado Rust; nenhum caminho fica fixo no app.
 * - qualquer outro caminho foi escolhido pelo usuário no seletor de arquivo.
 */
export type LibrarySource =
  | { kind: "sqlite"; path: string | null }
  | { kind: "xml"; path: string };

/** Motivo pelo qual a última tentativa de abrir uma fonte falhou. */
export interface SourceFailure {
  code: SqliteErrorCode | "XML_NOT_FOUND";
  message: string;
}
