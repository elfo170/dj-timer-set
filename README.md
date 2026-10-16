# DJ Timer Set

Aplicação desktop em Tauri (Rust + React/Frontend) para gerenciamento de tempo e análise de setlists de DJs a partir dos dados do banco de dados/exportação do Rekordbox.

---

## Status Atual do Projeto

- Leitura do Banco de Dados Real: ativa. Ao abrir, o app tenta ler o `master.db` do Rekordbox no caminho padrão (`%APPDATA%\Pioneer\rekordbox\master.db`).
- Seleção manual de fonte: se o `master.db` não for encontrado ou não puder ser aberto, o app oferece (1) selecionar o `master.db` manualmente ou (2) selecionar um XML exportado do Rekordbox. A última fonte escolhida manualmente é lembrada para as próximas aberturas.
- Nenhum caminho é fixo no app: tudo é resolvido a partir de `%APPDATA%` ou escolhido pelo usuário.

---

## Funcionalidades

- Cronômetro e Timer para Sets: Acompanhe a duração e o tempo restante do seu set em tempo real.
- Integração com DB: Leitura direta das informações de histórico e tracks.
- Build Automático: Compilação nativa para Windows (.msi).

---

## Tecnologias Utilizadas

- Core / Backend: Tauri (Rust)
- Database: SQLite / Rusqlite
- Frontend: React / TypeScript / Tailwind CSS
- CI/CD: GitHub Actions (Build & Release de .msi)

---

## Como Executar Localmente

### Pré-requisitos

1. Node.js (v18+)
2. Rust & Cargo (Toolchain configurada para compilação desktop)

### Instalação

```bash
# Clone o repositório
git clone [https://github.com/elfo170/dj-timer-set.git](https://github.com/elfo170/dj-timer-set.git)

# Entre no diretório
cd dj-timer-set

# Instale as dependências do frontend
npm install

# Execute em modo de desenvolvimento (Tauri + Vite)
npm run tauri dev
```

## Builds e Releases

Os instaladores oficiais para Windows (.msi) são gerados automaticamente via GitHub Actions.

Você pode baixar a versão mais recente em Releases (https://github.com/elfo170/dj-timer-set/releases).

---
