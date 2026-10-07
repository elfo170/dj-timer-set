mod rekordbox_paths;
mod sqlite_source;

use rekordbox_paths::rekordbox_xml_path;

/// Código de erro estável consumido pelo frontend quando o XML não existe.
const XML_NOT_FOUND: &str = "XML_NOT_FOUND";

/// Lê o rekordbox.xml do disco e devolve o conteúdo bruto.
/// O parse é feito no frontend (DOMParser), mantendo o Rust como uma
/// camada fina de acesso a arquivo.
#[tauri::command]
fn read_rekordbox_xml() -> Result<String, String> {
    let path = rekordbox_xml_path();

    if !path.exists() {
        return Err(XML_NOT_FOUND.to_string());
    }

    std::fs::read_to_string(&path)
        .map_err(|err| format!("Erro ao ler o arquivo: {err}"))
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            read_rekordbox_xml,
            sqlite_source::read_rekordbox_sqlite,
            sqlite_source::save_sqlcipher_key,
            sqlite_source::clear_sqlcipher_key,
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o DJ Set Timer");
}
