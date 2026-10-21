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
//!
//!    CORRIGIDO (achado na fonte primária, depois de uma falha real): tanto o
//!    projeto original do liamcottle quanto o código do pyrekordbox usam
//!    `PRAGMA key = '<chave>'` — a chave hex é uma SENHA que o SQLCipher
//!    deriva via PBKDF2, não bytes crus via `x'...'`. A versão anterior deste
//!    arquivo assumia modo raw key pra qualquer chave de 64 hex chars, o que
//!    nunca teria decodificado nada com a chave padrão. `open_and_verify`
//!    agora tenta modo senha primeiro e modo raw key como segunda tentativa.
//!    Se MESMO ASSIM falhar, aí sim o suspeito é o valor da chave em si.
//!    Contorno manual: usar a função save_sqlcipher_key com uma chave obtida via
//!    ferramentas de terceiros (ex.: CLI do pyrekordbox, RekordLocksmith).
//!
//! 2. MAPEAMENTO Kind → Hot Cue (ver `HOT_CUE_KINDS`)
//!    VERIFICADO contra um master.db real do Rekordbox 7 (takayamaki/rbx#7, 28.883
//!    cues): hot cues A–C são Kind 1–3, **Kind 4 é loop (não é hot cue)** e D–H são
//!    Kind 5–9. Kind 0 = memory cue. (A v0.3.0 assumia Kind N → letra N, o que
//!    deslocava D–H; A e B, os únicos conferidos naquela época, não eram afetados.)
//!
//! 2b. CORES E NOMES DOS HOT CUES
//!    `ColorTableIndex` (0/NULL = sem cor própria → verde padrão) indexa a paleta
//!    de hot cues do Rekordbox (`HOT_CUE_PALETTE`), conferida na tela por quem fez
//!    o CueGen (Deep-Symmetry/beat-link#51). O nome do cue vem de `Comment`. Se a
//!    instalação não tiver essas colunas, a leitura continua e só perde cor/nome.
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
use std::collections::{BTreeMap, HashMap, HashSet};
use std::path::PathBuf;

use crate::rekordbox_paths::default_master_db_path;

/// Ver nota (1) no cabeçalho do arquivo.
/// Fonte: extração pública via Frida em versões pré-6.6.5 do Rekordbox 6
/// (https://github.com/liamcottle/pioneer-rekordbox-database-encryption).
/// Aplicada como SENHA (`PRAGMA key = '...'`), como fazem o projeto original e
/// o pyrekordbox; `open_and_verify` tenta o modo raw key (`x'...'`) só como
/// segunda tentativa.
const DEFAULT_KEY_HEX: &str =
    "402fd482c38817c35ffa8ffb8c7d93143b749e7d315df7a81732a1ff43608497";

/// Kinds de hot cue no djmdCue, na ordem das letras A–H (ver nota 2 no cabeçalho).
/// Kind 4 fica de fora de propósito: no Rekordbox é loop, não hot cue.
const HOT_CUE_KINDS: [i64; 8] = [1, 2, 3, 5, 6, 7, 8, 9];

/// Paleta de hot cues do Rekordbox: `ColorTableIndex` → RGB. Índice 0 (e qualquer
/// valor fora da tabela) é o verde padrão. Fonte: Deep-Symmetry/beat-link#51.
const HOT_CUE_PALETTE: [(u8, u8, u8); 63] = [
    (0x28,0xe2,0x14), (0x30,0x5a,0xff), (0x50,0x73,0xff), (0x50,0x8c,0xff),
    (0x50,0xa0,0xff), (0x50,0xb4,0xff), (0x50,0xb0,0xf2), (0x50,0xae,0xe8),
    (0x45,0xac,0xdb), (0x00,0xe0,0xff), (0x19,0xda,0xf0), (0x32,0xd2,0xe6),
    (0x21,0xb4,0xb9), (0x20,0xaa,0xa0), (0x1f,0xa3,0x92), (0x19,0xa0,0x8c),
    (0x14,0xa5,0x84), (0x14,0xaa,0x7d), (0x10,0xb1,0x76), (0x30,0xd2,0x6e),
    (0x37,0xde,0x5a), (0x3c,0xeb,0x50), (0x28,0xe2,0x14), (0x7d,0xc1,0x3d),
    (0x8c,0xc8,0x32), (0x9b,0xd7,0x23), (0xa5,0xe1,0x16), (0xa5,0xdc,0x0a),
    (0xaa,0xd2,0x08), (0xb4,0xc8,0x05), (0xb4,0xbe,0x04), (0xba,0xb4,0x04),
    (0xc3,0xaf,0x04), (0xe1,0xaa,0x00), (0xff,0xa0,0x00), (0xff,0x96,0x00),
    (0xff,0x8c,0x00), (0xff,0x75,0x00), (0xe0,0x64,0x1b), (0xe0,0x46,0x1e),
    (0xe0,0x30,0x1e), (0xe0,0x28,0x23), (0xe6,0x28,0x28), (0xff,0x37,0x6f),
    (0xff,0x2d,0x6f), (0xff,0x12,0x7b), (0xf5,0x1e,0x8c), (0xeb,0x2d,0xa0),
    (0xe6,0x37,0xb4), (0xde,0x44,0xcf), (0xde,0x44,0x8d), (0xe6,0x30,0xb4),
    (0xe6,0x19,0xdc), (0xe6,0x00,0xff), (0xdc,0x00,0xff), (0xcc,0x00,0xff),
    (0xb4,0x32,0xff), (0xb9,0x3c,0xff), (0xc5,0x42,0xff), (0xaa,0x5a,0xff),
    (0xaa,0x72,0xff), (0x82,0x72,0xff), (0x64,0x73,0xff),
];

/// "#RRGGBB" da cor do hot cue; sem cor própria (NULL/0/fora da tabela) = verde padrão.
fn hot_cue_color_hex(color_table_index: Option<i64>) -> String {
    let (r, g, b) = match color_table_index {
        Some(i) if i >= 1 && (i as usize) < HOT_CUE_PALETTE.len() => HOT_CUE_PALETTE[i as usize],
        _ => HOT_CUE_PALETTE[0],
    };
    format!("#{r:02X}{g:02X}{b:02X}")
}

/// Hot cue de uma faixa: `index` 0 = A, 1 = B… 7 = H.
#[derive(Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HotCueDto {
    pub index: u32,
    pub seconds: f64,
    /// "#RRGGBB" na cor que o Rekordbox usa para este cue.
    pub color: String,
    /// Nome (comentário) do cue, se houver.
    pub name: Option<String>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SqliteTrackDto {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub bpm: Option<f64>,
    pub key: Option<String>,
    pub total_time_seconds: f64,
    /// Ordenados por índice (A, B, C…); memory cues ficam de fora.
    pub hot_cues: Vec<HotCueDto>,
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
/// `db_path`, se informado, é o master.db escolhido pelo usuário; sem ele usa
/// o caminho padrão (%APPDATA%\Pioneer\rekordbox\master.db).
///
/// `key_override`, se informado, tem prioridade sobre a chave salva e sobre a
/// chave padrão — é o que a UI usa quando o usuário cola uma chave manual.
#[tauri::command]
pub fn read_rekordbox_sqlite(
    app: tauri::AppHandle,
    db_path: Option<String>,
    key_override: Option<String>,
) -> Result<SqliteLibraryPayload, String> {
    let db_path = match db_path.filter(|p| !p.trim().is_empty()) {
        Some(p) => PathBuf::from(p),
        None => default_master_db_path().ok_or_else(|| "DB_NOT_FOUND".to_string())?,
    };

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
///
/// IMPORTANTE (corrigido após achar a fonte primária): tanto a documentação
/// do liamcottle (projeto original que extraiu a chave via Frida) quanto o
/// código-fonte do pyrekordbox usam `PRAGMA key = '<chave>'` — a chave hex é
/// tratada como SENHA (o SQLCipher deriva a chave real via PBKDF2), não como
/// bytes crus via `x'...'`. A versão anterior deste arquivo assumia modo raw
/// key pra chaves de 64 hex chars, o que nunca teria funcionado com a chave
/// padrão. Agora tentamos os dois modos, nessa ordem, e usamos o primeiro que
/// decodificar — cobre tanto esse caso quanto uma eventual chave raw real.
fn open_and_verify(path: &PathBuf, key: &str) -> Result<Connection, DbOpenError> {
    let looks_like_hex32 = key.len() == 64 && key.chars().all(|c| c.is_ascii_hexdigit());

    let mut attempts: Vec<String> = vec![format!("PRAGMA key = '{}';", key.replace('\'', "''"))];
    if looks_like_hex32 {
        attempts.push(format!("PRAGMA key = \"x'{key}'\";"));
    }

    let mut last_sqlite_err: Option<rusqlite::Error> = None;

    for pragma in attempts {
        let conn = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY)
            .map_err(DbOpenError::Sqlite)?;

        if let Err(e) = conn.execute_batch(&pragma) {
            last_sqlite_err = Some(e);
            continue;
        }

        // Primeira leitura real: é aqui que uma chave errada se manifesta.
        match conn.query_row("SELECT count(*) FROM sqlite_master", [], |row| {
            row.get::<_, i64>(0)
        }) {
            Ok(_) => return Ok(conn),
            Err(e) => last_sqlite_err = Some(e),
        }
    }

    let _ = last_sqlite_err; // guardado só pra depuração futura, se necessário
    Err(DbOpenError::DecryptFailed)
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

/// Hot cues por faixa, já ordenados por índice.
type CueMap = HashMap<String, Vec<HotCueDto>>;

fn table_columns(conn: &Connection, table: &str) -> rusqlite::Result<HashSet<String>> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({table})"))?;
    let names = stmt
        .query_map([], |row| row.get::<_, String>(1))?
        .collect::<Result<HashSet<_>, _>>()?;
    Ok(names)
}

fn value_to_opt_i64(value: SqlValue) -> Option<i64> {
    match value {
        SqlValue::Integer(i) => Some(i),
        SqlValue::Real(f) => Some(f as i64),
        SqlValue::Text(t) => t.trim().parse().ok(),
        _ => None,
    }
}

fn read_cues(conn: &Connection) -> rusqlite::Result<CueMap> {
    // Cor e nome são opcionais: se a instalação não tiver as colunas, só perdemos isso.
    let columns = table_columns(conn, "djmdCue")?;
    let color_expr = if columns.contains("ColorTableIndex") { "ColorTableIndex" } else { "NULL" };
    let name_expr = if columns.contains("Comment") { "Comment" } else { "NULL" };
    let kinds = HOT_CUE_KINDS.map(|k| k.to_string()).join(",");

    let mut stmt = conn.prepare(&format!(
        "SELECT ContentID, Kind, InMsec, {color_expr}, {name_expr} FROM djmdCue WHERE Kind IN ({kinds})"
    ))?;
    // Por faixa: índice do hot cue -> cue (duplicata: vale a última linha lida).
    let mut by_track: HashMap<String, BTreeMap<u32, HotCueDto>> = HashMap::new();

    let rows = stmt.query_map([], |row| {
        let content_id: SqlValue = row.get(0)?;
        let kind: i64 = row.get(1)?;
        let in_msec: SqlValue = row.get(2)?;
        let color_index: SqlValue = row.get(3)?;
        let comment: SqlValue = row.get(4)?;
        Ok((
            value_to_id_string(content_id),
            kind,
            value_to_opt_f64(in_msec),
            value_to_opt_i64(color_index),
            match comment {
                SqlValue::Text(t) => Some(t),
                _ => None,
            },
        ))
    })?;

    for row in rows {
        let (content_id, kind, in_msec, color_index, comment) = row?;
        let Some(ms) = in_msec else { continue };
        if ms < 0.0 {
            continue;
        }
        let Some(index) = HOT_CUE_KINDS.iter().position(|&k| k == kind) else {
            continue;
        };
        let index = index as u32;
        let name = comment.map(|c| c.trim().to_string()).filter(|c| !c.is_empty());
        by_track.entry(content_id).or_default().insert(
            index,
            HotCueDto {
                index,
                seconds: ms / 1000.0,
                color: hot_cue_color_hex(color_index),
                name,
            },
        );
    }

    Ok(by_track
        .into_iter()
        .map(|(content_id, cues)| (content_id, cues.into_values().collect()))
        .collect())
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
        let hot_cues = cues.get(&id).cloned().unwrap_or_default();

        tracks.push(SqliteTrackDto {
            id,
            title,
            artist,
            bpm: bpm_raw.map(|raw| raw / 100.0), // ver nota (3) no cabeçalho
            key: key.filter(|s| !s.is_empty()),
            total_time_seconds,
            hot_cues,
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
            CREATE TABLE djmdCue (ContentID TEXT, Kind INTEGER, InMsec REAL, ColorTableIndex INTEGER, Comment TEXT);
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

            INSERT INTO djmdCue VALUES ('t1', 1, 38000, 36, 'Drop');  -- Hot Cue A aos 38s, laranja, nomeado
            INSERT INTO djmdCue VALUES ('t1', 0, 5000, NULL, NULL);   -- memory cue, deve ser ignorado
            INSERT INTO djmdCue VALUES ('t2', 1, 30000, NULL, NULL);  -- A sem cor própria -> verde padrão
            INSERT INTO djmdCue VALUES ('t2', 3, 200000, 1, NULL);    -- C, inserido antes do B de propósito
            INSERT INTO djmdCue VALUES ('t2', 2, 330000, 62, NULL);   -- B
            INSERT INTO djmdCue VALUES ('t2', 4, 100000, 5, NULL);    -- Kind 4 = LOOP, não é hot cue
            INSERT INTO djmdCue VALUES ('t2', 5, 60000, 22, NULL);    -- Kind 5 = Hot Cue D
            INSERT INTO djmdCue VALUES ('t2', 9, 380000, 9, '   ');   -- Kind 9 = Hot Cue H, nome em branco

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

    fn cues_of(track: &SqliteTrackDto) -> Vec<(u32, f64)> {
        track.hot_cues.iter().map(|c| (c.index, c.seconds)).collect()
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
        assert_eq!(cues_of(t1), vec![(0, 38.0)], "memory cue (Kind=0) não é hot cue");
        // Replica o exemplo exato do briefing: 05:43 com HCA 00:38 e sem HCB -> 05:05
        let effective = t1.total_time_seconds - 38.0;
        assert_eq!(effective, 305.0, "343 - 38 = 305s = 05:05, igual ao exemplo do briefing");

        let t2 = payload.tracks.iter().find(|t| t.id == "t2").unwrap();
        assert_eq!(
            cues_of(t2),
            vec![(0, 30.0), (1, 330.0), (2, 200.0), (3, 60.0), (7, 380.0)],
            "A–C = Kind 1–3, Kind 4 (loop) ignorado, D–H = Kind 5–9; ordenados por índice"
        );
        let colors: Vec<&str> = t2.hot_cues.iter().map(|c| c.color.as_str()).collect();
        assert_eq!(colors, vec!["#28E214", "#6473FF", "#305AFF", "#28E214", "#00E0FF"]);
        assert!(t2.hot_cues.iter().all(|c| c.name.is_none()), "nome em branco vira None");
        assert_eq!(t1.hot_cues[0].color, "#FF8C00");
        assert_eq!(t1.hot_cues[0].name.as_deref(), Some("Drop"));

        let t3 = payload.tracks.iter().find(|t| t.id == "t3").unwrap();
        assert_eq!(t3.artist, "", "artista nulo vira string vazia, não erro");
        assert!(t3.hot_cues.is_empty());
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

    #[test]
    fn paleta_de_cores_dos_hot_cues() {
        assert_eq!(hot_cue_color_hex(Some(1)), "#305AFF");
        assert_eq!(hot_cue_color_hex(Some(36)), "#FF8C00"); // laranja (hot loops, conferido por terceiros)
        assert_eq!(hot_cue_color_hex(Some(62)), "#6473FF");
        for sem_cor in [None, Some(0), Some(63), Some(255), Some(-1)] {
            assert_eq!(hot_cue_color_hex(sem_cor), "#28E214", "{sem_cor:?} deve cair no verde padrão");
        }
    }

    #[test]
    fn schema_sem_colunas_de_cor_e_nome_continua_lendo() {
        let path = build_synthetic_db("sem_colunas");
        {
            let conn = Connection::open(&path).expect("abrir db de teste");
            conn.execute_batch(&format!("PRAGMA key = \"x'{TEST_KEY_HEX}'\";")).expect("chave");
            conn.execute_batch(
                "ALTER TABLE djmdCue DROP COLUMN ColorTableIndex; ALTER TABLE djmdCue DROP COLUMN Comment;",
            )
            .expect("remover colunas");
        }
        let payload = read_library_from_path(&path, TEST_KEY_HEX).expect("leitura sem colunas opcionais");
        let _ = std::fs::remove_file(&path);

        let t1 = payload.tracks.iter().find(|t| t.id == "t1").expect("t1");
        assert_eq!(cues_of(t1), vec![(0, 38.0)]);
        assert_eq!(t1.hot_cues[0].color, "#28E214", "sem a coluna de cor: verde padrão");
        assert_eq!(t1.hot_cues[0].name, None, "sem a coluna de nome: sem nome");
    }
}
