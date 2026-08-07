//! Leitura "tempo real" da biblioteca do Rekordbox via master.db (SQLCipher).
//!
//! ============================================================================
//! ATENÇÃO — LEIA ANTES DE MEXER AQUI (contexto para o "eu do futuro")
//! ============================================================================
//!
//! Este módulo é EXPERIMENTAL. Ele existe numa branch separada porque três
//! premissas abaixo não puderam ser validadas contra um master.db real durante
//! o desenvolvimento (sem Windows + Rekordbox disponíveis no ambiente de build):
//!
//! 1. CHAVE DE CRIPTOGRAFIA (`DEFAULT_KEY_HEX` abaixo)
//!    O master.db é cifrado com SQLCipher. Desde a v6.6.5 do Rekordbox, a
//!    Pioneer/AlphaTheta ofuscou o arquivo que continha a chave em texto puro,
//!    então não existe extração automática confiável a partir da instalação
//!    local. A comunidade (pyrekordbox e projetos irmãos) usa uma chave estática
//!    conhecida como fallback, pois documentação técnica de terceiros indica que
//!    a chave não varia por máquina/licença — mas é POSSÍVEL que a Pioneer tenha
//!    trocado a chave em alguma atualização da série 7.x. Se `read_rekordbox_sqlite`
//!    retornar o erro "DECRYPT_FAILED", é esse o suspeito nº 1.
//!    Contorno manual: usar a função save_sqlcipher_key com uma chave obtida via
//!    ferramentas de terceiros (ex.: CLI do pyrekordbox, RekordLocksmith).
//!
//! 2. MAPEAMENTO Kind → Hot Cue A/B (ver `HOT_CUE_A_KIND` / `HOT_CUE_B_KIND`)
//!    A tabela djmdCue guarda `Kind = 0` para memory cue e "o número do hot cue"
//!    para os demais, sem a documentação especificar se a numeração começa em
//!    0 ou 1. Assumimos Kind=1 → Hot Cue A e Kind=2 → Hot Cue B (analogia com o
//!    XML, que usa Num="0"/Num="1" para A/B com Num="-1" para memory cue — aqui
//!    parece haver um deslocamento de +1). Validar comparando os tempos exibidos
//!    no app (fonte = banco) com os mesmos exibidos com a fonte = XML para a
//!    mesma playlist.
//!
//! 3. ESCALA DO BPM (`bpm_raw / 100.0` em `track_from_row`)
//!    A documentação da tabela djmdContent não confirma a unidade da coluna BPM.
//!    Nos arquivos de análise (ANLZ) do Rekordbox o BPM é consistentemente
//!    armazenado ×100; assumimos o mesmo aqui. Validar contra o BPM mostrado no
//!    próprio Rekordbox para uma faixa conhecida.
//!
//! Fora essas três premissas, o restante (caminho do master.db, schema de
//! tabelas/colunas, junções para artista/key/playlist) vem de documentação
//! oficial de terceiros (pyrekordbox) e é bem mais confiável.
//!
//! Playlists inteligentes (Attribute = 4, condições calculadas dinamicamente)
//! NÃO são resolvidas por este módulo — o XML as exporta com o conteúdo já
//! materializado, mas o master.db guarda só a condição em XML dentro da coluna
//! SmartList. Reimplementar esse motor de condições ficou fora do escopo desta
//! primeira versão; playlists inteligentes simplesmente não aparecem na lista
//! quando a fonte é o banco de dados.
//! ============================================================================

use rusqlite::{types::Value as SqlValue, Connection, OpenFlags};
use serde::Serialize;
use std::collections::HashMap;
use std::path::PathBuf;

use crate::rekordbox_paths::master_db_path;

/// Ver nota (1) no cabeçalho do arquivo.
/// Fonte: extração pública via Frida em versões pré-6.6.5 do Rekordbox 6
/// (https://github.com/liamcottle/pioneer-rekordbox-database-encryption).
/// Chave RAW (32 bytes em hex), não uma senha — por isso é aplicada com a
/// sintaxe `PRAGMA key = "x'...'"` em vez de `PRAGMA key = '...'`.
const DEFAULT_KEY_HEX: &str =
    "402fd482c38817c35ffa8ffb8c7d93143b749e7d315df7a81732a1ff43608497";

/// Ver nota (2) no cabeçalho do arquivo.
const HOT_CUE_A_KIND: i64 = 1;
const HOT_CUE_B_KIND: i64 = 2;

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SqliteTrackDto {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub bpm: Option<f64>,
    pub key: Option<String>,
    pub total_time_seconds: f64,
    pub hot_cue_a_seconds: Option<f64>,
    pub hot_cue_b_seconds: Option<f64>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SqlitePlaylistDto {
    pub id: String,
    pub name: String,
    pub folder_path: Vec<String>,
    pub track_ids: Vec<String>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SqliteLibraryPayload {
    pub tracks: Vec<SqliteTrackDto>,
    pub playlists: Vec<SqlitePlaylistDto>,
}

/// Lê a biblioteca diretamente do master.db (sem exportar XML).
///
/// `key_override`, se informado, tem prioridade sobre a chave salva e sobre a
/// chave padrão — é o que a UI usa quando o usuário cola uma chave manual.
#[tauri::command]
pub fn read_rekordbox_sqlite(
    app: tauri::AppHandle,
    key_override: Option<String>,
) -> Result<SqliteLibraryPayload, String> {
    let db_path = master_db_path();

    let key = key_override
        .filter(|k| !k.trim().is_empty())
        .or_else(|| load_sqlcipher_key(app).ok().flatten())
        .unwrap_or_else(|| DEFAULT_KEY_HEX.to_string());

    read_library_from_path(&db_path, &key)
}

/// Núcleo puro (sem dependência de tauri::AppHandle) — separado do comando
/// acima para poder ser exercitado em testes automatizados (ver mod tests).
pub fn read_library_from_path(db_path: &PathBuf, key: &str) -> Result<SqliteLibraryPayload, String> {
    if !db_path.exists() {
        return Err("DB_NOT_FOUND".to_string());
    }

    let conn = open_and_verify(db_path, key).map_err(|e| e.to_error_code())?;

    let tracks = read_tracks(&conn).map_err(|e| format!("SCHEMA_ERROR: {e}"))?;
    let playlists = read_playlists(&conn).map_err(|e| format!("SCHEMA_ERROR: {e}"))?;

    Ok(SqliteLibraryPayload { tracks, playlists })
}

/// Salva uma chave SQLCipher informada manualmente pelo usuário, para reuso
/// automático nas próximas leituras (ver nota 1 no cabeçalho do arquivo).
#[tauri::command]
pub fn save_sqlcipher_key(app: tauri::AppHandle, key: String) -> Result<(), String> {
    let path = key_config_path(&app)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, key.trim()).map_err(|e| e.to_string())
}

/// Remove a chave manual salva, voltando a usar a chave padrão embutida.
#[tauri::command]
pub fn clear_sqlcipher_key(app: tauri::AppHandle) -> Result<(), String> {
    let path = key_config_path(&app)?;
    if path.exists() {
        std::fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn load_sqlcipher_key(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = key_config_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let trimmed = content.trim().to_string();
    Ok(if trimmed.is_empty() { None } else { Some(trimmed) })
}

fn key_config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    use tauri::Manager;
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Não foi possível localizar a pasta de configuração: {e}"))?;
    Ok(dir.join("sqlcipher_key.txt"))
}

enum DbOpenError {
    DecryptFailed,
    Sqlite(rusqlite::Error),
}

impl DbOpenError {
    fn to_error_code(&self) -> String {
        match self {
            DbOpenError::DecryptFailed => "DECRYPT_FAILED".to_string(),
            DbOpenError::Sqlite(e) => format!("DB_ERROR: {e}"),
        }
    }
}

/// Abre o master.db em modo somente-leitura, define a chave e confirma que a
/// decodificação funcionou de fato (PRAGMA key nunca falha sozinho — o erro só
/// aparece na primeira leitura real, então fazemos essa leitura aqui).
fn open_and_verify(path: &PathBuf, key: &str) -> Result<Connection, DbOpenError> {
    let conn = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(DbOpenError::Sqlite)?;

    let is_raw_key = key.len() == 64 && key.chars().all(|c| c.is_ascii_hexdigit());
    let pragma = if is_raw_key {
        format!("PRAGMA key = \"x'{key}'\";")
    } else {
        // Fallback: trata como senha e deixa o SQLCipher derivar a chave via KDF.
        format!("PRAGMA key = '{}';", key.replace('\'', "''"))
    };
    conn.execute_batch(&pragma).map_err(DbOpenError::Sqlite)?;

    // Primeira leitura real: é aqui que uma chave errada se manifesta.
    match conn.query_row("SELECT count(*) FROM sqlite_master", [], |row| {
        row.get::<_, i64>(0)
    }) {
        Ok(_) => Ok(conn),
        Err(_) => Err(DbOpenError::DecryptFailed),
    }
}

fn value_to_opt_string(v: SqlValue) -> Option<String> {
    match v {
        SqlValue::Text(s) if !s.is_empty() => Some(s),
        SqlValue::Integer(i) => Some(i.to_string()),
        SqlValue::Real(r) => Some(r.to_string()),
        _ => None,
    }
}

fn value_to_id_string(v: SqlValue) -> String {
    value_to_opt_string(v).unwrap_or_default()
}

fn value_to_opt_f64(v: SqlValue) -> Option<f64> {
    match v {
        SqlValue::Integer(i) => Some(i as f64),
        SqlValue::Real(r) => Some(r),
        SqlValue::Text(s) => s.parse::<f64>().ok(),
        _ => None,
    }
}

/// Cues de uma faixa: (segundos do Hot Cue A, segundos do Hot Cue B).
type CueMap = HashMap<String, (Option<f64>, Option<f64>)>;

fn read_cues(conn: &Connection) -> rusqlite::Result<CueMap> {
    let mut stmt = conn.prepare(
        "SELECT ContentID, Kind, InMsec FROM djmdCue WHERE Kind IN (?1, ?2)",
    )?;
    let mut map: CueMap = HashMap::new();

    let rows = stmt.query_map([HOT_CUE_A_KIND, HOT_CUE_B_KIND], |row| {
        let content_id: SqlValue = row.get(0)?;
        let kind: i64 = row.get(1)?;
        let in_msec: SqlValue = row.get(2)?;
        Ok((value_to_id_string(content_id), kind, value_to_opt_f64(in_msec)))
    })?;

    for row in rows {
        let (content_id, kind, in_msec) = row?;
        let seconds = in_msec.map(|ms| ms / 1000.0);
        let entry = map.entry(content_id).or_insert((None, None));
        if kind == HOT_CUE_A_KIND {
            entry.0 = seconds;
        } else if kind == HOT_CUE_B_KIND {
            entry.1 = seconds;
        }
    }

    Ok(map)
}

fn read_tracks(conn: &Connection) -> rusqlite::Result<Vec<SqliteTrackDto>> {
    let cues = read_cues(conn)?;

    let mut stmt = conn.prepare(
        "SELECT c.ID, c.Title, a.Name, c.BPM, k.ScaleName, c.Length \
         FROM djmdContent c \
         LEFT JOIN djmdArtist a ON a.ID = c.ArtistID \
         LEFT JOIN djmdKey k ON k.ID = c.KeyID",
    )?;

    let rows = stmt.query_map([], |row| {
        let id: SqlValue = row.get(0)?;
        let title: Option<String> = row.get(1)?;
        let artist: Option<String> = row.get(2)?;
        let bpm: SqlValue = row.get(3)?;
        let key: Option<String> = row.get(4)?;
        let length: SqlValue = row.get(5)?;
        Ok((
            value_to_id_string(id),
            title.unwrap_or_else(|| "(sem título)".to_string()),
            artist.unwrap_or_default(),
            value_to_opt_f64(bpm),
            key,
            value_to_opt_f64(length).unwrap_or(0.0),
        ))
    })?;

    let mut tracks = Vec::new();
    for row in rows {
        let (id, title, artist, bpm_raw, key, total_time_seconds) = row?;
        let (hot_cue_a_seconds, hot_cue_b_seconds) =
            cues.get(&id).copied().unwrap_or((None, None));

        tracks.push(SqliteTrackDto {
            id,
            title,
            artist,
            bpm: bpm_raw.map(|raw| raw / 100.0), // ver nota (3) no cabeçalho
            key: key.filter(|s| !s.is_empty()),
            total_time_seconds,
            hot_cue_a_seconds,
            hot_cue_b_seconds,
        });
    }

    Ok(tracks)
}

struct PlaylistRow {
    id: String,
    seq: i64,
    name: String,
    attribute: i64,
    parent_id: Option<String>,
}

fn is_root_parent(parent_id: &Option<String>) -> bool {
    match parent_id {
        None => true,
        Some(p) => p.is_empty() || p == "root",
    }
}

fn read_playlists(conn: &Connection) -> rusqlite::Result<Vec<SqlitePlaylistDto>> {
    let mut stmt =
        conn.prepare("SELECT ID, Seq, Name, Attribute, ParentID FROM djmdPlaylist")?;
    let rows = stmt.query_map([], |row| {
        let id: SqlValue = row.get(0)?;
        let seq: SqlValue = row.get(1)?;
        let name: Option<String> = row.get(2)?;
        let attribute: SqlValue = row.get(3)?;
        let parent_id: SqlValue = row.get(4)?;
        Ok(PlaylistRow {
            id: value_to_id_string(id),
            seq: value_to_opt_f64(seq).unwrap_or(0.0) as i64,
            name: name.unwrap_or_else(|| "(sem nome)".to_string()),
            attribute: value_to_opt_f64(attribute).unwrap_or(0.0) as i64,
            parent_id: value_to_opt_string(parent_id),
        })
    })?;

    let mut all: Vec<PlaylistRow> = Vec::new();
    for row in rows {
        all.push(row?);
    }

    // Agrupa por pai e ordena cada grupo por Seq — mesma semântica de ordem
    // que o parser de XML aplica à ordem dos nós <NODE>.
    let mut children_by_parent: HashMap<String, Vec<&PlaylistRow>> = HashMap::new();
    for p in &all {
        let key = if is_root_parent(&p.parent_id) {
            String::new()
        } else {
            p.parent_id.clone().unwrap_or_default()
        };
        children_by_parent.entry(key).or_default().push(p);
    }
    for group in children_by_parent.values_mut() {
        group.sort_by_key(|p| p.seq);
    }

    let song_playlist = read_song_playlist(conn)?;

    let mut result = Vec::new();
    walk_playlists(
        "",
        &[],
        &children_by_parent,
        &song_playlist,
        &mut result,
    );
    Ok(result)
}

fn walk_playlists(
    parent_key: &str,
    folder_path: &[String],
    children_by_parent: &HashMap<String, Vec<&PlaylistRow>>,
    song_playlist: &HashMap<String, Vec<String>>,
    out: &mut Vec<SqlitePlaylistDto>,
) {
    let Some(children) = children_by_parent.get(parent_key) else {
        return;
    };

    for node in children {
        match node.attribute {
            1 => {
                // Pasta: desce recursivamente, acumulando o caminho.
                let mut next_path = folder_path.to_vec();
                next_path.push(node.name.clone());
                walk_playlists(&node.id, &next_path, children_by_parent, song_playlist, out);
            }
            4 => {
                // Smart playlist: não resolvida nesta versão (ver nota no cabeçalho).
                continue;
            }
            _ => {
                out.push(SqlitePlaylistDto {
                    id: node.id.clone(),
                    name: node.name.clone(),
                    folder_path: folder_path.to_vec(),
                    track_ids: song_playlist.get(&node.id).cloned().unwrap_or_default(),
                });
            }
        }
    }
}

fn read_song_playlist(conn: &Connection) -> rusqlite::Result<HashMap<String, Vec<String>>> {
    let mut stmt = conn.prepare(
        "SELECT PlaylistID, ContentID, TrackNo FROM djmdSongPlaylist ORDER BY PlaylistID, TrackNo",
    )?;
    let rows = stmt.query_map([], |row| {
        let playlist_id: SqlValue = row.get(0)?;
        let content_id: SqlValue = row.get(1)?;
        Ok((value_to_id_string(playlist_id), value_to_id_string(content_id)))
    })?;

    let mut map: HashMap<String, Vec<String>> = HashMap::new();
    for row in rows {
        let (playlist_id, content_id) = row?;
        map.entry(playlist_id).or_default().push(content_id);
    }
    Ok(map)
}

#[cfg(test)]
mod tests {
    //! Testes de ponta a ponta contra um master.db SINTÉTICO (não é um arquivo
    //! real do Rekordbox). Eles validam o MECANISMO — sintaxe da chave raw do
    //! SQLCipher, os JOINs, a montagem da árvore de playlists, o cálculo de
    //! tempo — que é tudo coisa que dá pra garantir sem um Rekordbox real.
    //! Eles NÃO validam as três premissas documentadas no topo do arquivo
    //! (se a chave padrão é a mesma da instalação real do usuário, se Kind=1/2
    //! são mesmo Hot Cue A/B, se BPM é mesmo ×100) — isso só um master.db real
    //! confirma.
    use super::*;

    // 64 caracteres hex (32 bytes) — gerada com secrets.token_hex(32) e o
    // comprimento conferido via len(), não "de olho" (uma chave de teste com
    // comprimento errado, digitada à mão, já causou uma falha confusa aqui).
    const TEST_KEY_HEX: &str =
        "f9ba0bf7f136b91bd1b30d34683e1637599a39094e3aef384859920787a5ff3a";

    /// Cria um master.db sintético, cifrado com a mesma sintaxe de chave raw
    /// usada em produção, com um schema mínimo (só as colunas que o app lê).
    ///
    /// `name` precisa ser único por teste: os testes rodam em threads paralelas
    /// dentro do MESMO processo, então `std::process::id()` sozinho não isola
    /// nada — dois testes acabariam escrevendo no mesmo arquivo ao mesmo tempo.
    fn build_synthetic_db(name: &str) -> PathBuf {
        let mut path = std::env::temp_dir();
        path.push(format!("dj_set_timer_test_{}_{name}.db", std::process::id()));
        let _ = std::fs::remove_file(&path);

        let conn = Connection::open(&path).expect("criar db de teste");
        conn.execute_batch(&format!("PRAGMA key = \"x'{TEST_KEY_HEX}'\";"))
            .expect("definir chave de teste");

        conn.execute_batch(
            "
            CREATE TABLE djmdContent (ID TEXT, Title TEXT, ArtistID TEXT, BPM INTEGER, KeyID TEXT, Length REAL);
            CREATE TABLE djmdArtist (ID TEXT, Name TEXT);
            CREATE TABLE djmdKey (ID TEXT, ScaleName TEXT);
            CREATE TABLE djmdCue (ContentID TEXT, Kind INTEGER, InMsec REAL);
            CREATE TABLE djmdPlaylist (ID TEXT, Seq INTEGER, Name TEXT, Attribute INTEGER, ParentID TEXT);
            CREATE TABLE djmdSongPlaylist (PlaylistID TEXT, ContentID TEXT, TrackNo INTEGER);

            INSERT INTO djmdArtist VALUES ('ar1', 'Artista A'), ('ar2', 'Artista B');
            INSERT INTO djmdKey VALUES ('k1', '8A'), ('k2', '9A');

            -- Track 1: replica o exemplo do briefing (05:43, HCA 00:38, sem HCB) -> 05:05
            INSERT INTO djmdContent VALUES ('t1', 'Faixa Exemplo', 'ar1', 12800, 'k1', 343.0);
            -- Track 2: com HCA e HCB
            INSERT INTO djmdContent VALUES ('t2', 'Com A e B', 'ar2', 13000, 'k2', 400.0);
            -- Track 3: sem cues
            INSERT INTO djmdContent VALUES ('t3', 'Sem cues', NULL, NULL, NULL, 200.0);

            INSERT INTO djmdCue VALUES ('t1', 1, 38000);   -- Hot Cue A aos 38s
            INSERT INTO djmdCue VALUES ('t1', 0, 5000);    -- memory cue, deve ser ignorado
            INSERT INTO djmdCue VALUES ('t2', 1, 30000);
            INSERT INTO djmdCue VALUES ('t2', 2, 330000);

            INSERT INTO djmdPlaylist VALUES ('folder1', 1, 'Sets', 1, NULL);
            INSERT INTO djmdPlaylist VALUES ('pl1', 1, 'Set Teste', 0, 'folder1');
            INSERT INTO djmdPlaylist VALUES ('smart1', 2, 'Smart Ignorada', 4, 'folder1');

            INSERT INTO djmdSongPlaylist VALUES ('pl1', 't2', 1);
            INSERT INTO djmdSongPlaylist VALUES ('pl1', 't1', 2);
            INSERT INTO djmdSongPlaylist VALUES ('pl1', 't3', 3);
            ",
        )
        .expect("popular schema de teste");

        drop(conn);
        path
    }

    #[test]
    fn le_biblioteca_sintetica_ponta_a_ponta() {
        let path = build_synthetic_db("ponta_a_ponta");
        let payload = read_library_from_path(&path, TEST_KEY_HEX)
            .expect("leitura do master.db sintético deveria funcionar");
        let _ = std::fs::remove_file(&path);

        assert_eq!(payload.tracks.len(), 3, "deveria ler as 3 faixas");
        assert_eq!(payload.playlists.len(), 1, "smart playlist deve ser ignorada");

        let playlist = &payload.playlists[0];
        assert_eq!(playlist.name, "Set Teste");
        assert_eq!(playlist.folder_path, vec!["Sets".to_string()]);
        assert_eq!(
            playlist.track_ids,
            vec!["t2".to_string(), "t1".to_string(), "t3".to_string()],
            "ordem deve seguir TrackNo, não a ordem de inserção"
        );

        let t1 = payload.tracks.iter().find(|t| t.id == "t1").unwrap();
        assert_eq!(t1.title, "Faixa Exemplo");
        assert_eq!(t1.artist, "Artista A");
        assert_eq!(t1.bpm, Some(128.0), "BPM deveria ser dividido por 100");
        assert_eq!(t1.key.as_deref(), Some("8A"));
        assert_eq!(t1.hot_cue_a_seconds, Some(38.0));
        assert_eq!(t1.hot_cue_b_seconds, None);
        // Replica o exemplo exato do briefing: 05:43 com HCA 00:38 e sem HCB -> 05:05
        let effective = t1.total_time_seconds - t1.hot_cue_a_seconds.unwrap_or(0.0);
        assert_eq!(effective, 305.0, "343 - 38 = 305s = 05:05, igual ao exemplo do briefing");

        let t2 = payload.tracks.iter().find(|t| t.id == "t2").unwrap();
        assert_eq!(t2.hot_cue_a_seconds, Some(30.0));
        assert_eq!(t2.hot_cue_b_seconds, Some(330.0));

        let t3 = payload.tracks.iter().find(|t| t.id == "t3").unwrap();
        assert_eq!(t3.artist, "", "artista nulo vira string vazia, não erro");
        assert_eq!(t3.hot_cue_a_seconds, None);
        assert_eq!(t3.hot_cue_b_seconds, None);
    }

    #[test]
    fn chave_errada_retorna_decrypt_failed_em_vez_de_lixo() {
        let path = build_synthetic_db("chave_errada");
        let wrong_key = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

        let result = read_library_from_path(&path, wrong_key);
        let _ = std::fs::remove_file(&path);

        assert_eq!(
            result.unwrap_err(),
            "DECRYPT_FAILED",
            "chave incorreta deve falhar de forma explícita, nunca devolver dados incorretos"
        );
    }

    #[test]
    fn arquivo_inexistente_retorna_db_not_found() {
        let mut path = std::env::temp_dir();
        path.push("dj_set_timer_arquivo_que_nao_existe.db");
        let _ = std::fs::remove_file(&path);

        let result = read_library_from_path(&path, TEST_KEY_HEX);
        assert_eq!(result.unwrap_err(), "DB_NOT_FOUND");
    }
}
