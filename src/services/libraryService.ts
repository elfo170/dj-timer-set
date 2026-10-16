import { invoke } from "@tauri-apps/api/core";
import { parseRekordboxXml } from "@/parser/rekordboxXmlParser";
import type { RekordboxLibrary } from "@/types/rekordbox";

/** Erro lançado quando o XML escolhido não existe mais no disco. */
export class LibraryNotFoundError extends Error {
  constructor(path: string) {
    super(`O arquivo XML não foi encontrado em ${path}.`);
    this.name = "LibraryNotFoundError";
  }
}

/**
 * Contrato de leitura da biblioteca.
 *
 * A UI depende apenas desta interface: cada fonte (master.db, XML) é um
 * provider, e nenhum componente precisa saber de onde os dados vieram.
 */
export interface LibraryProvider {
  loadLibrary(): Promise<RekordboxLibrary>;
}

/** Lê um XML exportado do Rekordbox (caminho escolhido pelo usuário). */
export class XmlLibraryProvider implements LibraryProvider {
  constructor(private readonly path: string) {}

  async loadLibrary(): Promise<RekordboxLibrary> {
    let xml: string;
    try {
      xml = await invoke<string>("read_rekordbox_xml", { path: this.path });
    } catch (error) {
      if (error === "XML_NOT_FOUND") {
        throw new LibraryNotFoundError(this.path);
      }
      throw new Error(`Falha ao ler o XML: ${String(error)}`);
    }
    return parseRekordboxXml(xml);
  }
}
