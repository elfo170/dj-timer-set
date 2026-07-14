use std::path::PathBuf;

/// Caminho fixo do MVP: biblioteca do Rekordbox 7.2.14 do usuário Elfo.
const REKORDBOX_XML_PATH: &str =
    r"C:\Users\Elfo\AppData\Roaming\rekordbox\rekordbox\rekordbox.xml";

/// Código de erro estável consumido pelo frontend quando o XML não existe.
const XML_NOT_FOUND: &str = "XML_NOT_FOUND";

/// Lê o rekordbox.xml do disco e devolve o conteúdo bruto.
/// O parse é feito no frontend (DOMParser), mantendo o Rust como uma
/// camada fina de acesso a arquivo.
#[tauri::command]
fn read_rekordbox_xml() -> Result<String, String> {
    let path = PathBuf::from(REKORDBOX_XML_PATH);

    if !path.exists() {
        return Err(XML_NOT_FOUND.to_string());
    }

    std::fs::read_to_string(&path)
        .map_err(|err| format!("Erro ao ler o arquivo: {err}"))
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![read_rekordbox_xml])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o DJ Set Timer");
}
