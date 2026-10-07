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


## Release automática

Ao enviar uma tag `v*` (ex.: `v0.1.0`), o GitHub Actions compila o app no Windows e publica o `.msi` na aba Releases.

```bash
git tag v0.1.1
git push origin v0.1.1
```

## Fonte "tempo real" (SQLite/master.db) — experimental

Branch `feature/sqlite-realtime-source`, ainda não mesclada na `main`.

Além do XML, o app tenta ler o `master.db` do Rekordbox diretamente (mesma
pasta do `rekordbox.xml`), sem precisar exportar nada manualmente — reflete
mudanças de playlist/hot cue na hora. Se essa leitura falhar por qualquer
motivo, o app cai para o XML automaticamente e avisa na barra de fonte, no
topo da tela principal.

**Por que isso é experimental:** o `master.db` é cifrado (SQLCipher) e três
detalhes não puderam ser validados contra um arquivo real durante o
desenvolvimento (sem Windows + Rekordbox disponíveis no ambiente onde o
código foi escrito):

1. **Chave de criptografia.** Desde a v6.6.5 do Rekordbox a chave não é mais
   extraível automaticamente da instalação. O app usa uma chave conhecida da
   comunidade como padrão; se ela não bater com a sua instalação, a interface
   deixa você colar uma chave manualmente (persiste para as próximas leituras).
2. **Mapeamento Hot Cue A/B.** Assumimos `Kind=1` → A e `Kind=2` → B na tabela
   `djmdCue`, por analogia com o XML.
3. **Escala do BPM.** Assumimos que a coluna `BPM` vem ×100 (mesma convenção
   dos arquivos de análise do Rekordbox).

Validar é simples: abra uma playlist com a fonte "Banco (tempo real)", anote
os tempos, troque para "XML exportado" na mesma playlist e compare. Se
baterem, as três premissas acima estão corretas para a sua instalação.

**Limitação conhecida:** playlists inteligentes (smart playlists) não
aparecem quando a fonte é o banco — a condição fica salva como XML dentro do
banco e não é avaliada nesta versão. O XML exportado já vem com o conteúdo
resolvido, então continua funcionando normalmente nessa fonte.

Detalhes técnicos completos (procedência da chave, queries SQL, por que
`bundled-sqlcipher` em vez de `bundled-sqlcipher-vendored-openssl`) estão
comentados no topo de `src-tauri/src/sqlite_source.rs`. Os testes automáticos
em `src-tauri/src/sqlite_source.rs` (`cargo test`) criam um `master.db`
sintético cifrado e validam a leitura de ponta a ponta — rodam localmente e
no workflow `build-check.yml` a cada push nesta branch.

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
