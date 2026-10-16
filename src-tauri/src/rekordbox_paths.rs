//! Resolução dos caminhos padrão do Rekordbox.
//!
//! Nada aqui é específico de uma máquina ou usuário: o caminho padrão do
//! master.db é montado a partir da variável de ambiente %APPDATA% do Windows.
//! Qualquer outro caminho (master.db ou XML em outra pasta) é escolhido pelo
//! usuário na interface e chega aos comandos como argumento.
use std::ffi::OsString;
use std::path::PathBuf;

/// `%APPDATA%\Pioneer\rekordbox\master.db` — local padrão do banco do
/// Rekordbox 6/7. `None` se %APPDATA% não estiver definida.
pub fn default_master_db_path() -> Option<PathBuf> {
    master_db_path_under(std::env::var_os("APPDATA"))
}

fn master_db_path_under(appdata: Option<OsString>) -> Option<PathBuf> {
    let base = PathBuf::from(appdata.filter(|v| !v.is_empty())?);
    Some(base.join("Pioneer").join("rekordbox").join("master.db"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn monta_caminho_a_partir_do_appdata() {
        let p = master_db_path_under(Some(OsString::from("base"))).unwrap();
        assert!(p.starts_with("base"));
        assert!(p.ends_with(PathBuf::from("Pioneer").join("rekordbox").join("master.db")));
    }

    #[test]
    fn sem_appdata_retorna_none() {
        assert!(master_db_path_under(None).is_none());
        assert!(master_db_path_under(Some(OsString::new())).is_none());
    }
}
