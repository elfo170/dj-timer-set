fn main() {
    // OpenSSL estática (vcpkg, usada pelo bundled-sqlcipher) chama símbolos de
    // CryptoAPI e janela que ficam em user32/crypt32, mas o cargo não linka
    // essas libs por padrão — sem isso o link falha com LNK2019 em
    // OPENSSL_isservice/CertOpenStore e afins. Só é necessário no Windows.
    #[cfg(target_os = "windows")]
    {
        println!("cargo:rustc-link-lib=user32");
        println!("cargo:rustc-link-lib=crypt32");
    }

    tauri_build::build()
}
