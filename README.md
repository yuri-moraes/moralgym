<div align="center">

# MoralGym

**Seu diário de treino. Offline. Sem ads. Sem conta. Sem frescura.**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)
[![Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2-FF3E00?logo=svelte&logoColor=white)](https://kit.svelte.dev)
[![PWA](https://img.shields.io/badge/PWA-ready-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Local-First](https://img.shields.io/badge/Local--First-IndexedDB-success)](https://localfirstweb.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#-como-contribuir)

</div>

---

## Visão geral

Aplicativos de treino viraram um problema: pesam centenas de MB, exigem conta,
vendem seus dados, empurram planos premium e te forçam a ficar online pra
registrar uma série de supino.

**MoralGym é o oposto disso.** É um PWA enxuto, Local-First e 100% offline, feito
para uma única tarefa: registrar seu treino de musculação com o mínimo de
fricção possível entre você e a próxima série.

### O que o app resolve

- 🏋️ **Foco no treino, não no app.** Interface mobile-first, sem gamification,
  sem feed social, sem "coach IA".
- 🔌 **Offline-first de verdade.** Depois do primeiro carregamento, funciona no
  subsolo, no avião ou no vestiário sem sinal. Nenhuma requisição externa.
- 🔒 **Privacidade total.** Seus dados ficam no `IndexedDB` do seu navegador.
  Não existe servidor para hackear — porque não existe servidor.
- 💸 **Sem ads. Sem paywall. Sem telemetria opaca.** Licenciado em **GNU GPLv3**:
  é seu, é nosso, é de todo mundo.
- ⚡ **Leve.** Bundle inicial otimizado — sem bibliotecas de componentes
  pesadas, sem runtime de framework bloated.
- 📅 **Divisões flexíveis.** Suporta de A/B (full-body 2x) até A/B/C/D/E
  (bro split clássico).
- ⏱️ **Cronômetro de descanso confiável.** Roda em Web Worker: continua correto
  mesmo com a tela apagada, e te avisa com notificação nativa.

## Decisões arquiteturais

O projeto adota **Arquitetura Hexagonal (Ports and Adapters)** no frontend.
Parece overkill para um app de treino — e é exatamente aí que mora a intenção
didática: este repo também serve como demonstração de boas práticas de
engenharia de software aplicadas a um PWA real.

```
┌─────────────────────────────────────────────────┐
│  UI (Svelte)                                    │
│  ├─ components, stores, rotas                   │
└───────────────┬─────────────────────────────────┘
                │ consome
                ▼
┌─────────────────────────────────────────────────┐
│  CORE  (puro, sem I/O)                          │
│  ├─ domain/   entities, VOs, services           │
│  └─ application/  use-cases + PORTS (interfaces)│
└───────────────▲─────────────────────────────────┘
                │ implementa
┌───────────────┴─────────────────────────────────┐
│  ADAPTERS                                       │
│  ├─ Dexie (IndexedDB)                           │
│  ├─ Canvas (compressão WebP)                    │
│  ├─ Web Worker (rest timer)                     │
│  └─ Notification API                            │
└─────────────────────────────────────────────────┘
```

**O Core não importa `dexie`, `svelte` ou `sentry`.** Toda dependência externa
atravessa uma interface (Port). Na prática, isso significa:

- Trocar `IndexedDB` por, digamos, `OPFS` ou `SQLite WASM` no futuro é uma
  troca de arquivo, não uma reescrita.
- O domínio (cálculo de volume, estimativa de 1RM, formatação de tempo) é
  100% testável em `vitest` sem browser, sem mocks complicados.
- Novos dispositivos de entrada (voz, wearables) entram como novos Adapters
  — sem tocar no núcleo.

Detalhes em [`src/core/`](./src/core) e [`src/adapters/`](./src/adapters).

## Stack tecnológica

| Camada       | Escolha                       | Por quê                                               |
| ------------ | ----------------------------- | ----------------------------------------------------- |
| Framework    | **Svelte 5 + SvelteKit**      | Menor bundle possível, compilador em vez de runtime   |
| Build        | **Vite 6 + adapter-static**   | SSG puro com fallback SPA, hospedável em qualquer CDN |
| Estilo       | **Tailwind CSS**              | Zero component library, design system utilitário      |
| Persistência | **Dexie.js sobre IndexedDB**  | Queries ergonômicas, transações, suporte a `Blob`     |
| PWA          | **vite-plugin-pwa + Workbox** | Precache + navigation fallback offline                |
| Tipos        | **TypeScript estrito**        | Contratos explícitos em toda fronteira                |
| Testes       | **Vitest + fake-indexeddb**   | Domínio testado puro; adapters testados sem browser   |
| Erros        | **Sentry (opt-in)**           | Sem PII — body de requests sempre scrubbed            |

## Como usar (usuários finais)

1. Abra o app: **[moralgym.app](https://moralgym.app)**
2. No seu celular, toque em **"Adicionar à tela inicial"** (Android) ou
   **"Compartilhar → Adicionar à Tela de Início"** (iOS / Safari).
3. Abra pela tela inicial. A partir daqui, o app funciona mesmo sem internet.
4. Cadastre seus exercícios, monte suas fichas (Treino A/B/C…) e comece a
   registrar suas séries.

> 💾 Seus dados ficam **apenas no seu celular**. Trocar de aparelho? A função de
> exportar/importar JSON está no roadmap.

## Guia de instalação local (devs)

### Pré-requisitos

- **Node.js 20+** e **npm 10+**
- Um navegador moderno (Chrome/Edge 108+, Firefox 110+, Safari 16+)

### Passos

```bash
# 1. Clone
git clone https://github.com/<seu-user>/moralgym.git
cd moralgym

# 2. Dependências
npm install

# 3. Dev server (HMR, porta 5173)
npm run dev

# 4. Build de produção estático (saída em ./build)
npm run build

# 5. Testa build localmente
npm run preview
```

### Scripts úteis

| Comando                 | O que faz                           |
| ----------------------- | ----------------------------------- |
| `npm run dev`           | Dev server com HMR                  |
| `npm run build`         | Gera `./build` pronto para CDN      |
| `npm run check`         | Type-check com `svelte-check`       |
| `npm run lint`          | ESLint + Prettier (check)           |
| `npm run format`        | Prettier (write)                    |
| `npm run test`          | Suíte Vitest (unit, focada no Core) |
| `npm run test:coverage` | Cobertura via `@vitest/coverage-v8` |

### Estrutura do repo (resumo)

```
src/
├── core/                 # Domínio + use cases (sem I/O)
│   ├── domain/           # entities, value-objects, services
│   └── application/      # ports (interfaces) + use-cases
├── adapters/             # Implementações concretas dos ports
│   ├── persistence/      # Dexie.js + IndexedDB
│   ├── media/            # Canvas → WebP
│   ├── timer/            # Web Worker rest timer
│   └── notifications/    # Notification API
├── workers/              # Web Workers (entrypoints)
├── ui/                   # Componentes Svelte + stores
├── lib/                  # Composition root, Sentry setup
└── routes/               # SvelteKit (SPA)
```

## Como contribuir

Contribuições são **muito bem-vindas**. Lembre: este projeto é licenciado em
**GPLv3** — qualquer fork distribuído deve permanecer GPLv3 e manter o código
aberto.

### Fluxo

1. **Faça fork** do repositório.
2. **Crie uma branch descritiva** a partir de `main`:
   ```
   feature/exportar-json
   fix/rest-timer-ios-background
   docs/readme-pt-br
   ```
3. **Commits pequenos e significativos.** Use [Conventional Commits](https://www.conventionalcommits.org/pt-br/)
   (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
4. **Rode antes de abrir PR**:
   ```bash
   npm run lint
   npm run check
   npm run test
   ```
5. **Abra o Pull Request** descrevendo:
   - O problema / a motivação (issue linkada se houver)
   - A abordagem escolhida e alternativas consideradas
   - Passo-a-passo para testar manualmente
6. Um mantenedor vai revisar. Iteramos em cima do PR, fazemos squash e merge.

### Checklist para Pull Requests

- [ ] Lint e type-check passando (`npm run lint && npm run check`)
- [ ] Testes unitários cobrindo lógica de domínio nova
- [ ] Não introduziu dependência nova no `src/core/` fora de Ports
- [ ] Arquivos novos respeitam a divisão Core / Adapters
- [ ] Sem chamadas de rede para domínios externos (Local-First!)
- [ ] Atualizou este README se tocou em arquitetura, scripts ou stack

### Boas primeiras contribuições

Issues com label `good first issue` são pontos de entrada recomendados.
Se não há nenhuma aberta, sugestões em formato de issue ("quero ajudar com X")
são bem-vindas **antes** do PR.

## Licença

Distribuído sob **GNU General Public License v3.0 ou posterior**.
Leia o texto completo em [`LICENSE`](./LICENSE).

TL;DR (não substitui o texto legal): você pode usar, estudar, modificar e
redistribuir — inclusive comercialmente — desde que qualquer obra derivada
distribuída também seja GPLv3 e mantenha o código fonte disponível.

---

<div align="center">
Feito com ❤️ e ferro. <br/>
<sub>Sem ads. Sem trackers. Sem asterisco.</sub>
</div>
