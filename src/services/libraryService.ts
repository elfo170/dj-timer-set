import { invoke } from "@tauri-apps/api/core";
import { parseRekordboxXml } from "@/parser/rekordboxXmlParser";
import type { RekordboxLibrary } from "@/types/rekordbox";

/** Erro lançado quando o rekordbox.xml não existe no caminho padrão. */
export class LibraryNotFoundError extends Error {
  constructor() {
    super(
      "O XML do Rekordbox não foi encontrado em " +
        "C:\\Users\\Elfo\\AppData\\Roaming\\rekordbox\\rekordbox\\rekordbox.xml.",
    );
    this.name = "LibraryNotFoundError";
  }
}

/**
 * Contrato de leitura da biblioteca.
 *
 * A UI depende apenas desta interface. Para migrar do XML para o banco
 * SQLite do Rekordbox no futuro, basta criar um novo provider (ex.:
 * SqliteLibraryProvider) e trocá-lo em createLibraryProvider() — nenhum
 * componente precisa mudar.
 */
export interface LibraryProvider {
  loadLibrary(): Promise<RekordboxLibrary>;
}

/** Provider atual: lê o rekordbox.xml via comando Rust do Tauri. */
export class XmlLibraryProvider implements LibraryProvider {
  async loadLibrary(): Promise<RekordboxLibrary> {
    let xml: string;
    try {
      xml = await invoke<string>("read_rekordbox_xml");
    } catch (error) {
      if (error === "XML_NOT_FOUND") {
        throw new LibraryNotFoundError();
      }
      throw new Error(`Falha ao ler o arquivo rekordbox.xml: ${String(error)}`);
    }
    return parseRekordboxXml(xml);
  }
}

/** Ponto único de criação do provider usado pela aplicação. */
export function createLibraryProvider(): LibraryProvider {
  return new XmlLibraryProvider();
}
