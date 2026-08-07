//! Resolução de caminhos dos arquivos do Rekordbox.
//!
//! Caminho fixo do MVP (usuário único: Elfo). O master.db é resolvido como
//! irmão do rekordbox.xml na mesma pasta — não assumimos a pasta clássica
//! "AppData\Roaming\Pioneer\rekordbox" documentada para Rekordbox 5/6, porque
//! o caminho de XML fornecido para este app já usa uma estrutura diferente
//! ("AppData\Roaming\rekordbox\rekordbox\..."), o que sugere que a v7 pode ter
//! abandonado a pasta intermediária "Pioneer". Como o caminho do XML já foi
//! validado em uso real, ancorar o master.db nessa mesma pasta é a aposta mais
//! segura.
use std::path::PathBuf;

pub const REKORDBOX_XML_PATH: &str =
    r"C:\Users\Elfo\AppData\Roaming\rekordbox\rekordbox\rekordbox.xml";

pub fn rekordbox_xml_path() -> PathBuf {
    PathBuf::from(REKORDBOX_XML_PATH)
}

/// master.db vive na mesma pasta que o rekordbox.xml (ver nota do módulo).
pub fn master_db_path() -> PathBuf {
    rekordbox_xml_path()
        .parent()
        .map(|dir| dir.join("master.db"))
        .unwrap_or_else(|| PathBuf::from("master.db"))
}
