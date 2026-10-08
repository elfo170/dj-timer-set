import { open } from "@tauri-apps/plugin-dialog";

async function pickFile(
  title: string,
  filterName: string,
  extensions: string[],
): Promise<string | null> {
  const selected = await open({
    title,
    multiple: false,
    directory: false,
    filters: [{ name: filterName, extensions }],
  });
  return typeof selected === "string" ? selected : null;
}

/** Abre o seletor de arquivo para o master.db do Rekordbox. null = cancelado. */
export function pickMasterDbPath(): Promise<string | null> {
  return pickFile("Selecione o master.db do Rekordbox", "Banco do Rekordbox", ["db"]);
}

/** Abre o seletor de arquivo para um XML exportado do Rekordbox. null = cancelado. */
export function pickXmlPath(): Promise<string | null> {
  return pickFile("Selecione o XML exportado do Rekordbox", "XML do Rekordbox", ["xml"]);
}
