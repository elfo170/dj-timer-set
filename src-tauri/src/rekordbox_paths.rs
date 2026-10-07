//! Resolução de caminhos dos arquivos do Rekordbox.
//!
//! Caminho fixo do MVP (usuário único: Elfo).
//!
//! O master.db NÃO fica na mesma pasta do rekordbox.xml — essa era a hipótese
//! original (pasta "rekordbox\rekordbox" abandonando o "Pioneer" na v7), mas
//! foi testada e refutada em uso real: o master.db segue no caminho clássico
//! "AppData\Roaming\Pioneer\rekordbox\master.db", mesmo com o Rekordbox na
//! v7.2.14. Caminho confirmado diretamente no Explorer nesta máquina.
use std::path::PathBuf;

pub const REKORDBOX_XML_PATH: &str =
    r"C:\Users\Elfo\AppData\Roaming\rekordbox\rekordbox\rekordbox.xml";

pub const MASTER_DB_PATH: &str =
    r"C:\Users\Elfo\AppData\Roaming\Pioneer\rekordbox\master.db";

pub fn rekordbox_xml_path() -> PathBuf {
    PathBuf::from(REKORDBOX_XML_PATH)
}

pub fn master_db_path() -> PathBuf {
    PathBuf::from(MASTER_DB_PATH)
}
