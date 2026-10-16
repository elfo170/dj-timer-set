mod rekordbox_paths;
mod sqlite_source;

/// Código de erro estável consumido pelo frontend quando o XML não existe.
const XML_NOT_FOUND: &str = "XML_NOT_FOUND";

/// Lê um XML do Rekordbox do caminho informado e devolve o conteúdo bruto.
/// O caminho vem sempre da interface (seletor de arquivo) — nada é fixo no
/// app. O parse é feito no frontend (DOMParser), mantendo o Rust como uma
/// camada fina de acesso a arquivo.
#[tauri::command]
fn read_rekordbox_xml(path: String) -> Result<String, String> {
    let path = std::path::PathBuf::from(path);

    if !path.is_file() {
        return Err(XML_NOT_FOUND.to_string());
    }

    std::fs::read_to_string(&path).map_err(|err| format!("Erro ao ler o arquivo: {err}"))
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_rekordbox_xml,
            sqlite_source::read_rekordbox_sqlite,
            sqlite_source::save_sqlcipher_key,
            sqlite_source::clear_sqlcipher_key,
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o DJ Set Timer");
}
