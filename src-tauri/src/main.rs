// Evita abrir uma janela de console junto com o app no Windows (release).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    dj_set_timer_lib::run()
}
