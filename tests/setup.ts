// Ativa IndexedDB em memória para testes de adapters/integração Dexie.
// Testes puros de domínio não dependem disso, mas importar aqui é
// idempotente e custa zero em startup.
import 'fake-indexeddb/auto';
