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

## Pontos de início e fim do cálculo

Por padrão o tempo de cada faixa é **Hot Cue B − Hot Cue A** (sem A → 00:00; sem B → fim da faixa).
Isso é configurável, na playlist inteira e faixa a faixa, com o mesmo seletor em duas linhas:

```
|<-  A B C D
->|  E F G H
```

`|<-` é o início da faixa, `->|` é o fim da faixa e A–H são os hot cues. O `|<-` só vale como ponto inicial e o `->|`
só como ponto final (o outro aparece apagado).

- **Na playlist inteira:** a barra "Pontos do cálculo (playlist)" tem um seletor de **Início** e outro de **Fim**.
- **Por faixa:** cada linha tem os seus. O ponto com anel é o usado; sem o pontinho branco ele é o padrão da
  playlist, com o pontinho é uma exceção desta faixa. Clicar no ponto da exceção (ou no ponto do padrão) volta a
  faixa a seguir a playlist. Hot cues que a faixa não tem aparecem tracejados; passe o mouse num ponto para ver o
  nome do cue (se tiver) e o tempo.
- **Cores:** cada hot cue aparece na cor que tem no Rekordbox — no XML pelos atributos `Red/Green/Blue` e no
  `master.db` pelo `ColorTableIndex` (paleta de hot cues do Rekordbox; sem cor própria = verde padrão).
- **Hot cue ausente:** o início cai em 00:00 e o fim na duração total (tempo em itálico). Fim antes do início →
  tempo 00:00, em vermelho.
- **"Restaurar padrão"** volta a playlist para A → B e remove todas as exceções.
- As escolhas são **salvas por playlist** (caminho de pastas + nome) e sobrevivem a fechar o app, a "Recarregar" e à
  troca de fonte (master.db ↔ XML). Exceções por faixa são indexadas pelo id da faixa.

### Hot cues no master.db

`djmdCue.Kind`: **A–C = 1–3, Kind 4 é loop (ignorado), D–H = 5–9** (verificado por terceiros contra um
`master.db` real do Rekordbox 7). A v0.3.0 assumia Kind N → letra N, o que deslocava os hot cues D–H; da v1.0 em
diante o mapeamento está corrigido. São suportados os hot cues A–H.

## Créditos

Criado por Maci - @maci.mp3 | Apoie o projeto - Pix: bookings.maci@gmail.com
