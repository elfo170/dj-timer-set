# DJ Timer Set

Aplicação desktop em Tauri (Rust + React/Frontend) para gerenciamento de tempo e análise de setlists de DJs a partir dos dados do banco de dados/exportação do Rekordbox.

---

## Status Atual do Projeto

- Leitura do Banco de Dados Real: A leitura do banco de dados real já está ativa e integrada ao sistema.
- Exportação de XML (Fallback Temporário): 
  > Nota Importante: O fallback para exportação/leitura de arquivos XML no momento está configurado com um caminho hardcoded apontando para a máquina do desenvolvedor. A seleção dinâmica de caminho e tratamento definitivo deste fallback serão ajustados na versão v1.0.

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
