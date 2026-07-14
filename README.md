# DJ Set Timer

Aplicação desktop (Windows) que lê a biblioteca do Rekordbox 7.2.14 e calcula o tempo efetivo de um set a partir dos Hot Cues A e B de cada faixa.

## Como funciona

- Ao abrir, o app lê automaticamente o XML em
  `C:\Users\Elfo\AppData\Roaming\rekordbox\rekordbox\rekordbox.xml`.
  Se o arquivo não existir, uma mensagem é exibida.
- Selecione uma playlist na barra lateral (com busca).
- Para cada faixa: **tempo = Hot Cue B − Hot Cue A**.
  - Sem Hot Cue A → considera `00:00`.
  - Sem Hot Cue B → considera a duração total da música.
- O resumo mostra tempo total (HH:MM:SS), quantidade de músicas e média por música.
- Escolha uma meta (30 / 45 / 60 / 90 / 120 min) para ver quanto falta ou quanto ultrapassou.
- **Recarregar** relê o XML do disco.
- A ordem das faixas segue exatamente a ordem da playlist no Rekordbox.

## Stack

React · TypeScript · Vite · TailwindCSS · shadcn/ui · Lucide · Tauri v2

## Desenvolvimento

```bash
npm install
npm run tauri dev
```

## Build local

```bash
npm run tauri build
```

O instalador `.msi` fica em `src-tauri/target/release/bundle/msi/`.


## ⚠️ Ativar o CI (passo único)

O token usado no deploy não tinha o escopo `workflow`, então o GitHub bloqueou o push do arquivo de workflow. O YAML já está pronto em [`.github/release-workflow.yml`](.github/release-workflow.yml). Para ativar:

1. No GitHub: **Add file → Create new file**.
2. Caminho: `.github/workflows/release.yml`.
3. Cole o conteúdo de `.github/release-workflow.yml` e faça o commit.
4. Em **Actions → Release → Run workflow**, informe a tag `v0.1.0` (já publicada). O `.msi` sai na aba **Releases**.

Nas próximas versões, basta enviar uma nova tag `v*` que a release sai sozinha.

## Release automática

Ao enviar uma tag `v*` (ex.: `v0.1.0`), o GitHub Actions compila o app no Windows e publica o `.msi` na aba Releases.

```bash
git tag v0.1.1
git push origin v0.1.1
```

## Arquitetura

```
src/
  components/   UI (sidebar, tabela, resumo) + primitivos shadcn
  pages/        Composição de tela (HomePage)
  hooks/        useLibrary (carregamento + recarregar)
  services/     libraryService — interface LibraryProvider
  parser/       rekordboxXmlParser — parser do rekordbox.xml
  types/        Tipos do domínio
  utils/        Cálculo do set e formatação de tempo
src-tauri/      Camada desktop (comando Rust read_rekordbox_xml)
```

A UI depende apenas da interface `LibraryProvider`. Para migrar do XML para o banco SQLite do Rekordbox no futuro, basta implementar um novo provider e trocá-lo em `createLibraryProvider()` — nenhuma tela muda.
