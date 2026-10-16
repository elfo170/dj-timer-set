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

## Pontos de início e fim do cálculo (v0.3.0)

Por padrão o tempo de cada faixa é **Hot Cue B − Hot Cue A** (sem A → 00:00; sem B → fim da faixa).
Agora isso é configurável:

- **Na playlist inteira:** a barra "Pontos do cálculo (playlist)" tem um seletor de **Início** e outro de **Fim**
  (início da faixa, qualquer Hot Cue A–H…, fim da faixa). Vale para todas as faixas da playlist.
- **Por faixa:** cada linha da tabela tem seus próprios seletores de Início e Fim. A opção
  "Padrão (…)" volta a faixa a seguir a playlist; qualquer outra escolha vira uma exceção (destacada em cor).
- **Hot cue ausente:** se a faixa não tem o hot cue escolhido, o início cai em 00:00 e o fim na duração
  total (tempo em itálico, com dica ao passar o mouse). Fim antes do início → tempo 00:00, destacado em vermelho.
- **"Restaurar padrão"** volta a playlist para A → B e remove todas as exceções.
- As escolhas são **salvas por playlist** (caminho de pastas + nome) e sobrevivem a fechar o app, a "Recarregar"
  e à troca de fonte (master.db ↔ XML). Exceções por faixa são indexadas pelo id da faixa.

Hot cues C em diante no `master.db` são lidos por inferência (Kind=3 → C…), seguindo o padrão de A/B (já
validado em máquina real); vale conferir contra o XML se usar muitos hot cues.

