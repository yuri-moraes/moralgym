# MoralGym — Guia Prático de SvelteKit para Devs Next.js/React

Este documento ensina SvelteKit usando o projeto MoralGym como base prática. A premissa é que você já conhece **Next.js** e **React** e quer entender como o mundo Svelte funciona — sem sair do codebase real.

---

## Índice

1. [O que é o MoralGym?](#1-o-que-é-o-moralgym)
2. [Setup e execução](#2-setup-e-execução)
3. [Estrutura de pastas — onde cada coisa vive](#3-estrutura-de-pastas)
4. [Roteamento — arquivos como rotas](#4-roteamento)
5. [Layouts — o equivalente ao `_app.tsx`](#5-layouts)
6. [Carregamento de dados — sem `getServerSideProps`](#6-carregamento-de-dados)
7. [Componentes Svelte vs. Componentes React](#7-componentes-svelte-vs-react)
8. [Reatividade — Svelte 5 Runes vs. useState/useMemo](#8-reatividade-runes)
9. [Eventos e formulários](#9-eventos-e-formulários)
10. [Gerenciamento de estado global](#10-estado-global)
11. [Arquitetura do projeto — Hexagonal + DI](#11-arquitetura-hexagonal)
12. [Persistência local — Dexie (IndexedDB)](#12-persistência-dexie)
13. [PWA e Service Worker](#13-pwa)
14. [Fluxos principais do app](#14-fluxos-principais)
15. [Tabela de equivalências](#15-tabela-de-equivalências)

---

## 1. O que é o MoralGym?

MoralGym é um **PWA offline-first** para registro de treinos de força. Toda a persistência é local (IndexedDB via Dexie) — zero backend. O app roda 100% no browser.

**Funcionalidades:**
- Criar fichas de treino (rotinas com divisões A/B/C/D/E)
- Adicionar exercícios às divisões
- Registrar séries (sets) com repetições, carga e RPE
- Visualizar histórico de treinos
- Timer de descanso com notificação

**Stack:**
- **SvelteKit 2.15** com **Svelte 5**
- **TypeScript 5.7**
- **TailwindCSS 3.4**
- **Dexie 4** (IndexedDB)
- **Vite 6** + adaptador estático (gera HTML puro, sem Node.js em produção)
- **Vitest** para testes

---

## 2. Setup e execução

```bash
npm install
npm run dev        # servidor de desenvolvimento
npm run build      # build estático em /build
npm run preview    # preview do build
npm run test       # testes com Vitest
npm run check      # type-check Svelte + TypeScript
```

A build gera arquivos estáticos que podem ser hospedados em Netlify, Vercel, GitHub Pages, ou qualquer CDN. Não há servidor Node.js em produção.

---

## 3. Estrutura de pastas

```
src/
├── routes/          ← ROTEAMENTO (equivalente ao /app ou /pages do Next.js)
├── lib/             ← utilitários e container de DI ($lib)
├── ui/
│   ├── components/  ← componentes reutilizáveis (ainda vazios)
│   └── stores/      ← stores globais Svelte (ainda vazios)
├── core/            ← lógica de domínio pura (sem framework)
│   ├── domain/      ← entidades, value objects, services
│   └── application/ ← use cases e interfaces de portas
├── adapters/        ← implementações concretas (Dexie, Web Worker, etc.)
├── workers/         ← Web Workers
├── app.css          ← estilos globais + Tailwind
└── app.html         ← template HTML raiz (equivalente ao _document.tsx)
```

**Comparação com Next.js:**

| Next.js                  | SvelteKit                    |
|--------------------------|------------------------------|
| `/app` ou `/pages`       | `src/routes/`                |
| `layout.tsx`             | `+layout.svelte`             |
| `page.tsx`               | `+page.svelte`               |
| `loading.tsx`            | (não existe nativo, use runes) |
| `_document.tsx`          | `src/app.html`               |
| `_app.tsx`               | `src/routes/+layout.svelte`  |
| `src/components/`        | `src/ui/components/`         |
| `@/` alias               | `$lib/` alias                |

---

## 4. Roteamento

SvelteKit usa **roteamento baseado em sistema de arquivos**, assim como o Next.js App Router. As convenções de nomes são diferentes:

### Convenções de arquivos

| Arquivo             | Propósito                                           |
|---------------------|-----------------------------------------------------|
| `+page.svelte`      | A página renderizada para aquela rota               |
| `+page.ts`          | Carregamento de dados para a página (`load` function) |
| `+layout.svelte`    | Layout que envolve filhos daquela rota              |
| `+layout.ts`        | Carregamento de dados para o layout                 |
| `+error.svelte`     | Página de erro para aquela rota                     |
| `+server.ts`        | API endpoint (GET, POST, etc.)                      |

### Rotas do MoralGym

```
src/routes/
├── +layout.svelte              → layout raiz (header + nav inferior)
├── +layout.ts                  → configura SSR desligado globalmente
├── +page.ts                    → redireciona / para /fichas
├── fichas/
│   ├── +page.svelte            → /fichas (lista de fichas)
│   ├── nova/
│   │   └── +page.svelte        → /fichas/nova (criar ficha)
│   └── [routineId]/
│       └── [splitId]/
│           ├── +page.svelte    → /fichas/:routineId/:splitId (divisão)
│           └── exercicios/
│               └── novo/
│                   └── +page.svelte  → /fichas/.../exercicios/novo
└── historico/
    └── +page.svelte            → /historico (histórico de treinos)
```

### Segmentos dinâmicos

Colchetes `[param]` funcionam igual ao Next.js:

```
/fichas/[routineId]/[splitId]
```

Para acessar os parâmetros em `+page.svelte`:

```svelte
<script lang="ts">
  import { page } from '$app/stores';

  // acessa os params da URL
  const routineId = $page.params.routineId;
  const splitId = $page.params.splitId;
</script>
```

Em Next.js você faria:
```tsx
// app/fichas/[routineId]/[splitId]/page.tsx
export default function Page({ params }) {
  const { routineId, splitId } = params;
}
```

### Navegação programática

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';

  async function salvar() {
    await criarFicha();
    goto('/fichas'); // equivalente ao router.push('/fichas')
  }
</script>
```

### Links

```svelte
<!-- SvelteKit: use <a> normal, o roteador intercepta -->
<a href="/fichas/nova">Criar ficha</a>

<!-- Next.js: precisa do componente Link -->
<Link href="/fichas/nova">Criar ficha</Link>
```

No SvelteKit, links `<a>` comuns já são interceptados pelo roteador client-side. Não precisa de um componente especial.

---

## 5. Layouts

O arquivo `src/routes/+layout.svelte` é o **layout raiz** — envolve todas as páginas. Equivale ao `app/layout.tsx` do Next.js.

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';

  // $page.url.pathname para highlighting da nav ativa
  let pathname = $derived($page.url.pathname);
</script>

<!-- Header fixo no topo -->
<header class="sticky top-0 ...">
  <span>MoralGym</span>
</header>

<!-- Conteúdo da página filha -->
<main>
  {@render children()}   <!-- equivalente ao {children} do React -->
</main>

<!-- Nav inferior fixa -->
<nav class="fixed bottom-0 ...">
  <a href="/fichas" class:active={pathname.startsWith('/fichas')}>
    Fichas
  </a>
  <a href="/historico" class:active={pathname === '/historico'}>
    Histórico
  </a>
</nav>
```

**`{@render children()}`** é o Svelte 5 equivalente ao `{children}` do React dentro de layouts.

### Layout aninhado

Você pode criar `+layout.svelte` em qualquer subpasta. Ele envolve apenas as rotas daquela subpasta, e ainda fica dentro do layout pai:

```
routes/
├── +layout.svelte          ← layout raiz (header + nav)
└── fichas/
    ├── +layout.svelte      ← layout só de /fichas e filhos
    └── +page.svelte
```

---

## 6. Carregamento de dados

No MoralGym, **SSR está desligado** porque o app usa IndexedDB (browser-only). Isso é configurado em `src/routes/+layout.ts`:

```typescript
// src/routes/+layout.ts
export const ssr = false;
export const prerender = false;
```

Portanto, todo o carregamento de dados acontece **no cliente**, dentro de `onMount`:

```svelte
<!-- src/routes/fichas/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { getContainer } from '$lib/container';
  import type { Routine, Split } from '../core/domain/entities/Routine';

  let routine = $state<Routine | null>(null);
  let splits = $state<readonly Split[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      const { routines } = getContainer();
      routine = await routines.findActive();
      if (routine) {
        splits = await routines.findSplits(routine.id);
      }
    } catch (e) {
      error = 'Erro ao carregar fichas';
    } finally {
      loading = false;
    }
  });
</script>
```

**Em Next.js com App Router**, você usaria:
```tsx
// com SSR:
export default async function Page() {
  const routine = await fetchActiveRoutine();
  return <RoutineView routine={routine} />;
}

// client-side (equivalente):
'use client';
export default function Page() {
  const [routine, setRoutine] = useState(null);
  useEffect(() => {
    fetchActiveRoutine().then(setRoutine);
  }, []);
}
```

### Quando usar `+page.ts` para load?

O arquivo `+page.ts` contém uma função `load` que roda antes da página renderizar. É útil para buscar dados de APIs externas (com SSR habilitado):

```typescript
// src/routes/fichas/+page.ts  (hipotético com SSR)
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
  const res = await fetch('/api/routines/active');
  const routine = await res.json();
  return { routine }; // disponível como `data` na página
};
```

```svelte
<!-- +page.svelte recebe os dados via prop `data` -->
<script lang="ts">
  let { data } = $props();
  // data.routine disponível aqui
</script>
```

No projeto atual, isso não é usado porque tudo é local/offline.

---

## 7. Componentes Svelte vs. React

### Estrutura de um componente Svelte

Todo componente `.svelte` tem até 3 blocos:

```svelte
<script lang="ts">
  // Lógica TypeScript aqui
</script>

<!-- Template HTML aqui -->
<div>...</div>

<style>
  /* CSS com escopo automático */
  div { color: red; }
</style>
```

**Não existe JSX.** O template é HTML com extensões do Svelte.

### Props

```svelte
<!-- Componente filho: ExerciseCard.svelte -->
<script lang="ts">
  interface Props {
    name: string;
    muscleGroup: string;
    targetSets: number;
  }

  let { name, muscleGroup, targetSets }: Props = $props();
</script>

<div>
  <h3>{name}</h3>
  <span>{muscleGroup}</span>
  <span>{targetSets} séries</span>
</div>
```

```svelte
<!-- Pai usa o componente -->
<script lang="ts">
  import ExerciseCard from './ExerciseCard.svelte';
</script>

<ExerciseCard name="Supino Reto" muscleGroup="chest" targetSets={4} />
```

**Comparação React:**
```tsx
// React
interface Props { name: string; muscleGroup: string; targetSets: number; }
export function ExerciseCard({ name, muscleGroup, targetSets }: Props) {
  return <div><h3>{name}</h3></div>;
}
```

### Renderização condicional

```svelte
<!-- Svelte -->
{#if loading}
  <p>Carregando...</p>
{:else if error}
  <p>Erro: {error}</p>
{:else}
  <p>Dados carregados!</p>
{/if}
```

```tsx
// React
{loading ? <p>Carregando...</p> : error ? <p>Erro: {error}</p> : <p>Dados!</p>}
```

### Listas (map)

```svelte
<!-- Svelte -->
{#each splits as split (split.id)}
  <div>{split.label} — {split.name}</div>
{:else}
  <p>Nenhuma divisão.</p>
{/each}
```

```tsx
// React
{splits.length === 0
  ? <p>Nenhuma divisão.</p>
  : splits.map(split => <div key={split.id}>{split.label}</div>)}
```

O `(split.id)` entre parênteses no `{#each}` é a **key** (como o `key` do React).

### Classes condicionais

```svelte
<!-- class:nome={condição} é um atalho do Svelte -->
<a
  href="/fichas"
  class="nav-item"
  class:active={pathname.startsWith('/fichas')}
>
  Fichas
</a>
```

```tsx
// React (com clsx ou template string)
<a
  href="/fichas"
  className={`nav-item ${pathname.startsWith('/fichas') ? 'active' : ''}`}
>
  Fichas
</a>
```

### Slots / children

Em Svelte 5, o conteúdo filho é passado via `{@render children()}`:

```svelte
<!-- Card.svelte -->
<script lang="ts">
  let { children } = $props();
</script>

<div class="card">
  {@render children()}
</div>
```

```svelte
<!-- Uso -->
<Card>
  <p>Conteúdo interno</p>
</Card>
```

---

## 8. Reatividade — Runes

Svelte 5 introduziu **runes**: funções especiais prefixadas com `$` que substituem as diretivas reativas antigas.

### `$state` — equivalente ao `useState`

```svelte
<script lang="ts">
  let count = $state(0);
  let name = $state('');
  let items = $state<string[]>([]);
</script>

<button onclick={() => count++}>
  Cliques: {count}
</button>
```

```tsx
// React
const [count, setCount] = useState(0);
<button onClick={() => setCount(c => c + 1)}>Cliques: {count}</button>
```

**Diferença importante:** em Svelte, você **muta diretamente** a variável. Não existe `setState`. O compilador detecta a mutação e atualiza o DOM.

### `$derived` — equivalente ao `useMemo`

```svelte
<script lang="ts">
  let splits = $state<Split[]>([]);

  // Recomputa automaticamente quando `splits` muda
  let orderedSplits = $derived(
    [...splits].sort((a, b) => a.orderIndex - b.orderIndex)
  );
</script>
```

```tsx
// React
const orderedSplits = useMemo(
  () => [...splits].sort((a, b) => a.orderIndex - b.orderIndex),
  [splits]
);
```

### `$effect` — equivalente ao `useEffect`

```svelte
<script lang="ts">
  let userId = $state('');

  $effect(() => {
    // Roda quando userId muda
    console.log('userId mudou:', userId);

    return () => {
      // cleanup (equivalente ao retorno do useEffect)
    };
  });
</script>
```

```tsx
// React
useEffect(() => {
  console.log('userId mudou:', userId);
  return () => { /* cleanup */ };
}, [userId]);
```

**Diferença:** Svelte detecta as dependências **automaticamente** — você não precisa de array de dependências. Qualquer `$state` lido dentro do `$effect` vira dependência automaticamente.

### `$props` — equivalente ao desestruturar props

```svelte
<script lang="ts">
  let { name, age = 0, onSave } = $props();
  //                  ^^^^ valor padrão
</script>
```

```tsx
// React
function Component({ name, age = 0, onSave }) { ... }
```

### Diferença filosófica: compilador vs. runtime

| React                          | Svelte                                   |
|--------------------------------|------------------------------------------|
| Virtual DOM, runtime diffing   | Compilado, manipulação direta do DOM     |
| `useState` + `setState`        | `$state` + mutação direta               |
| `useMemo`, `useCallback`       | `$derived`, não precisa de `useCallback` |
| Hook rules (no conditionals)   | Runes sem restrições                     |
| Bundle inclui React runtime    | Bundle inclui quase zero framework       |

---

## 9. Eventos e formulários

### Event handlers

```svelte
<!-- Svelte: diretiva onclick (sem camelCase) -->
<button onclick={handleClick}>Clique</button>
<button onclick={() => count++}>Incrementar</button>

<!-- Com modificadores -->
<form onsubmit={(e) => { e.preventDefault(); salvar(); }}>
```

```tsx
// React
<button onClick={handleClick}>Clique</button>
<form onSubmit={(e) => { e.preventDefault(); salvar(); }}>
```

**Nota:** Svelte 5 usa `onclick` (minúsculo) em vez de `onClick`.

### Formulário controlado

```svelte
<script lang="ts">
  let name = $state('');
  let splitCount = $state<1|2|3|4|5>(3);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    await createRoutine({ name, splitCount });
    goto('/fichas');
  }
</script>

<form onsubmit={handleSubmit}>
  <!-- bind:value faz two-way binding -->
  <input bind:value={name} placeholder="Nome da ficha" />

  <!-- bind:group para radio buttons -->
  {#each [1, 2, 3, 4, 5] as n}
    <label>
      <input type="radio" bind:group={splitCount} value={n} />
      {n}x
    </label>
  {/each}

  <button type="submit">Criar</button>
</form>
```

```tsx
// React
const [name, setName] = useState('');
<input value={name} onChange={e => setName(e.target.value)} />
```

**`bind:value`** cria two-way binding automático — não precisa de `onChange` manual. Equivale ao `value + onChange` do React.

### Outros bindings comuns

```svelte
<input bind:value={texto} />           <!-- texto string -->
<input type="number" bind:value={num} /> <!-- num number (auto-converte) -->
<input type="checkbox" bind:checked={ativo} />
<select bind:value={opcao}>
<textarea bind:value={conteudo} />
```

---

## 10. Estado global

O projeto ainda não usa stores globais (a pasta `src/ui/stores/` está vazia), mas o SvelteKit oferece **Svelte Stores**:

### Writable store (equivalente ao Zustand/Context)

```typescript
// src/ui/stores/activeRoutine.ts
import { writable } from 'svelte/store';
import type { Routine } from '../../core/domain/entities/Routine';

export const activeRoutine = writable<Routine | null>(null);
```

```svelte
<!-- Em qualquer componente -->
<script lang="ts">
  import { activeRoutine } from '$lib/stores/activeRoutine';

  // O prefixo $ "subscreve" o store automaticamente
  // Svelte cancela a subscription quando o componente é destruído
</script>

<p>Ficha ativa: {$activeRoutine?.name ?? 'Nenhuma'}</p>

<button onclick={() => activeRoutine.set(null)}>
  Desativar ficha
</button>
```

### Readable / Derived stores

```typescript
import { readable, derived } from 'svelte/store';

// readonly
export const now = readable(new Date(), (set) => {
  const interval = setInterval(() => set(new Date()), 1000);
  return () => clearInterval(interval); // cleanup
});

// derivado de outro store
export const formattedNow = derived(now, ($now) =>
  $now.toLocaleDateString('pt-BR')
);
```

### Store `$app/stores` (builtin)

SvelteKit expõe stores prontos:

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  // $page.url, $page.params, $page.data, $page.route, etc.
</script>

<p>Rota atual: {$page.url.pathname}</p>
<p>Param routineId: {$page.params.routineId}</p>
```

---

## 11. Arquitetura Hexagonal

O MoralGym segue **Clean Architecture / Hexagonal Architecture** — a lógica de negócio não depende de nenhum framework:

```
src/
├── core/                    ← framework-agnostic (pode rodar em Node, browser, teste)
│   ├── domain/
│   │   ├── entities/        ← objetos de negócio (Routine, Split, Exercise, WorkoutLog)
│   │   ├── value-objects/   ← tipos imutáveis (MuscleGroup, ExerciseMedia)
│   │   └── services/        ← lógica de domínio pura (VolumeCalculator, TimeFormatter)
│   └── application/
│       ├── ports/           ← interfaces/contratos (o que o core precisa do mundo externo)
│       │   └── repositories/
│       └── use-cases/       ← orquestradores de lógica de negócio
├── adapters/                ← implementações concretas das portas
│   └── persistence/dexie/   ← implementa ExerciseRepository usando IndexedDB
└── lib/
    └── container.ts         ← único ponto que conecta tudo (Composition Root)
```

### Fluxo de dependência

```
UI (Svelte) → container.ts → Use Cases → Ports (interfaces)
                                              ↑
                          Adapters (Dexie, Worker, etc.) implementam as Ports
```

A UI **nunca importa** de `src/adapters/` diretamente. Ela usa `getContainer()` para obter os use cases:

```svelte
<!-- src/routes/fichas/nova/+page.svelte -->
<script lang="ts">
  import { getContainer } from '$lib/container';

  async function handleSubmit() {
    const { createRoutine } = getContainer();

    // Use case faz toda a lógica: validação, ID, timestamps, persistência
    await createRoutine.execute({
      name,
      splitCount,
      splits: splitNames.map(n => ({ name: n })),
      setAsActive: true
    });

    goto('/fichas');
  }
</script>
```

### Container de injeção de dependência

`src/lib/container.ts` é o **Composition Root** — singleton que instancia tudo:

```typescript
// src/lib/container.ts (simplificado)
let container: AppContainer | null = null;

export function getContainer(): AppContainer {
  if (!container) {
    // Instancia adaptadores concretos
    const db = getDatabase();
    const exerciseRepo = new DexieExerciseRepository(db);
    const routineRepo = new DexieRoutineRepository(db);
    const logRepo = new DexieWorkoutLogRepository(db);
    const timer = new WebWorkerRestTimer();
    const notifications = new BrowserNotificationService();

    // Instancia use cases injetando as dependências
    container = {
      exercises: exerciseRepo,
      routines: routineRepo,
      logs: logRepo,
      createRoutine: new CreateRoutineUseCase(routineRepo),
      logSet: new LogSetUseCase(logRepo, new StartRestTimerUseCase(timer, notifications)),
    };
  }
  return container;
}
```

**Por que isso é valioso para testes?**

```typescript
// Em testes, você substitui as implementações reais por fakes
import { __resetContainerForTests } from '$lib/container';

beforeEach(() => {
  __resetContainerForTests(); // limpa o singleton
  // configura mocks...
});
```

---

## 12. Persistência — Dexie (IndexedDB)

Dexie é um wrapper elegante para IndexedDB. Pense nele como um banco de dados SQLite no browser.

### Schema

```typescript
// src/adapters/persistence/dexie/database.ts
import Dexie from 'dexie';

class MoralGymDatabase extends Dexie {
  exercises!: Dexie.Table;
  routines!: Dexie.Table;
  splits!: Dexie.Table;
  splitExercises!: Dexie.Table;
  workoutLogs!: Dexie.Table;

  constructor() {
    super('MoralGymDB');
    this.version(1).stores({
      exercises: 'id, nameLower, muscleGroup, updatedAt',
      routines: 'id, isActive, updatedAt',
      splits: 'id, routineId, [routineId+orderIndex]',
      splitExercises: 'id, splitId, exerciseId, [splitId+orderIndex]',
      workoutLogs: 'id, splitId, exerciseId, performedAt, [exerciseId+performedAt]',
    });
  }
}
```

Os strings definem os **índices**. O primeiro campo é sempre a primary key. `[a+b]` cria índice composto.

### Repositório (implementação de uma Port)

```typescript
// src/adapters/persistence/dexie/DexieRoutineRepository.ts
export class DexieRoutineRepository implements RoutineRepository {
  constructor(private db: MoralGymDatabase) {}

  async findActive(): Promise<Routine | null> {
    const record = await this.db.routines
      .where('isActive').equals(1)
      .first();
    return record ? toRoutine(record) : null;
  }

  async save(routine: Routine, splits: Split[]): Promise<void> {
    // Transação atômica — ou tudo salva, ou nada salva
    await this.db.transaction('rw', [this.db.routines, this.db.splits], async () => {
      await this.db.routines.put(fromRoutine(routine));
      await this.db.splits.bulkPut(splits.map(fromSplit));
    });
  }
}
```

### Mappers (Record ↔ Entity)

IndexedDB armazena dados serializados. Os mappers convertem entre o formato de persistência e as entidades de domínio:

```typescript
// Entidade de domínio usa Date, boolean, etc.
interface Routine {
  id: string;
  isActive: boolean;   // boolean limpo
  createdAt: Date;     // objeto Date
}

// Record do IndexedDB usa formatos mais primitivos
interface RoutineRecord {
  id: string;
  isActive: 0 | 1;     // IndexedDB não indexa boolean nativamente
  createdAt: number;   // epoch ms para eficiência de índice
}

function toRoutine(r: RoutineRecord): Routine {
  return {
    ...r,
    isActive: r.isActive === 1,
    createdAt: new Date(r.createdAt),
  };
}
```

---

## 13. PWA

O app é configurado como **Progressive Web App** — instalável, funciona offline.

### Configuração

```typescript
// vite.config.ts (simplificado)
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
  plugins: [
    sveltekit(),
    SvelteKitPWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'MoralGym',
        short_name: 'MoralGym',
        theme_color: '#0B0B0D',
        display: 'standalone', // sem barra de endereço
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
});
```

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({
      fallback: 'index.html', // SPA fallback para roteamento client-side offline
      precompress: true,       // gzip + brotli automático
    }),
  },
};
```

**SSR desligado** porque:
1. Os dados estão no IndexedDB do browser (não acessível no servidor)
2. O app é hospedado como arquivos estáticos

---

## 14. Fluxos principais

### Criar uma ficha (`/fichas/nova`)

1. Usuário preenche nome, escolhe quantidade de divisões, nomeia cada divisão
2. `onsubmit` do formulário chama `createRoutine.execute()`
3. **CreateRoutineUseCase** valida os dados, cria entidades com IDs únicos
4. Delega ao **DexieRoutineRepository** que salva em transação atômica
5. `goto('/fichas')` redireciona para a home

### Ver split de uma ficha (`/fichas/[routineId]/[splitId]`)

1. `onMount` lê `$page.params` para obter IDs
2. Busca o split e seus exercícios via repositório
3. Renderiza lista de exercícios com badges de séries/repetições/descanso

### Histórico (`/historico`)

1. `onMount` busca últimos 500 logs ordenados por data
2. Agrupa por data (hoje/ontem/data formatada)
3. Dentro de cada dia, agrupa por exercício
4. Renderiza séries de cada exercício

---

## 15. Tabela de equivalências

| Conceito                     | React / Next.js                         | SvelteKit / Svelte 5                    |
|------------------------------|-----------------------------------------|-----------------------------------------|
| Arquivo de página            | `app/foo/page.tsx`                      | `src/routes/foo/+page.svelte`           |
| Layout                       | `app/layout.tsx`                        | `+layout.svelte`                        |
| Carregamento server-side     | `async function Page()` / `loader`      | `+page.ts` com função `load`            |
| Carregamento client-side     | `useEffect + useState`                  | `onMount + $state`                      |
| Estado local                 | `useState(val)`                         | `$state(val)` + mutação direta          |
| Valor derivado               | `useMemo(() => ..., [deps])`            | `$derived(...)` (deps automáticas)      |
| Efeito colateral             | `useEffect(() => ..., [deps])`          | `$effect(() => ...)` (deps automáticas) |
| Props do componente          | `function C({ name }: Props)`           | `let { name } = $props()`              |
| Renderizar filhos            | `{children}`                            | `{@render children()}`                  |
| Two-way binding              | `value + onChange`                      | `bind:value`                            |
| Classe condicional           | `clsx()` ou template string             | `class:nome={condição}`                 |
| Lista com key                | `array.map(x => <El key={x.id} />)`    | `{#each arr as x (x.id)}`              |
| Condicional                  | Operador ternário / `&&`                | `{#if} {:else if} {:else} {/if}`       |
| Navegação programática       | `router.push('/rota')`                  | `goto('/rota')`                         |
| Link                         | `<Link href="/rota">`                   | `<a href="/rota">`                      |
| Parâmetros de rota           | `params.id` via props ou `useParams`    | `$page.params.id`                       |
| Estado global                | Context API / Zustand / Redux           | Svelte Stores (`writable`, `readable`)  |
| CSS com escopo               | CSS Modules / styled-components         | `<style>` em `.svelte` (auto-scoped)    |
| Alias de imports             | `@/` (tsconfig paths)                   | `$lib/` (builtin do SvelteKit)          |
| Document HTML raiz           | `_document.tsx`                         | `src/app.html`                          |
| API routes                   | `app/api/route.ts`                      | `src/routes/api/+server.ts`             |
| Variáveis de ambiente        | `NEXT_PUBLIC_VAR` / `process.env.VAR`   | `PUBLIC_VAR` / `import.meta.env.VAR`   |
| Static export                | `output: 'export'` no next.config.js    | `adapter-static` no svelte.config.js   |

---

## Próximos passos sugeridos

Para aprender mais explorando o codebase, siga esta ordem:

1. **Leia** `src/routes/+layout.svelte` — entenda a estrutura base e como a nav funciona
2. **Leia** `src/routes/fichas/+page.svelte` — veja `$state`, `onMount`, `{#if}`, `{#each}`
3. **Leia** `src/routes/fichas/nova/+page.svelte` — veja `bind:value`, formulário controlado
4. **Leia** `src/lib/container.ts` — entenda o container de DI
5. **Leia** `src/core/application/use-cases/CreateRoutineUseCase.ts` — lógica pura sem framework
6. **Leia** `src/adapters/persistence/dexie/DexieRoutineRepository.ts` — como Dexie funciona
7. **Crie** um novo componente em `src/ui/components/` e use-o em uma página
8. **Crie** uma nova rota simples para praticar o sistema de arquivos

Referências oficiais:
- [SvelteKit Docs](https://kit.svelte.dev/docs)
- [Svelte 5 Runes](https://svelte-5-preview.vercel.app/docs/runes)
- [Dexie.js Docs](https://dexie.org/docs/)
