import type { LibrarySource } from "@/types/librarySource";

const STORAGE_KEY = "djSetTimer.manualSource";

/**
 * Última fonte escolhida manualmente pelo usuário (master.db ou XML fora do
 * caminho padrão). Só é usada depois que o caminho padrão do master.db falha,
 * para o usuário não precisar escolher o arquivo a cada abertura.
 */
export function readSavedSource(): LibrarySource | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as { kind?: unknown; path?: unknown };
    if (typeof value.path !== "string" || !value.path) return null;
    if (value.kind === "sqlite") return { kind: "sqlite", path: value.path };
    if (value.kind === "xml") return { kind: "xml", path: value.path };
  } catch {
    // storage indisponível ou JSON inválido: tratamos como "nada salvo"
  }
  return null;
}

export function writeSavedSource(source: LibrarySource): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(source));
  } catch {
    // sem persistência: o app continua funcionando, só pede o arquivo de novo
  }
}
