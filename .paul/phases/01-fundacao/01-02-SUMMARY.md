---
phase: 01-fundacao
plan: 02
completed: 2026-10-22T16:00:00Z
duration: ~1h (2 rebuilds nativos)
description: "SQLite com SQLCipher comprovadamente criptografado no aparelho: chave de 256 bits no secure-store, migrations atômicas, recusa explícita de banco em claro"
type: Summary
about: "ciclo-livre"
---

# Phase 1 Plan 02: Banco criptografado + migrations — Summary

**O app abre um banco SQLCipher no Galaxy S21: o arquivo copiado do aparelho não abre como SQLite ("file is not a database") e o nome da tabela não aparece em texto claro.**

## What Was Built

| File | Purpose |
|------|---------|
| `src/db/key.ts` | `getOrCreateDatabaseKey`: 32 bytes aleatórios → 64 hex no secure-store; valor corrompido gera erro sem sobrescrever |
| `src/db/migrations.ts` | `runMigrations` por `PRAGMA user_version`, uma transação por migration; v1 = `app_meta` STRICT |
| `src/db/database.ts` | `initDatabase`: PRAGMA key → `cipher_version` (senão `DatabaseNotEncryptedError`) → foreign_keys → migrations |
| `src/db/open.ts` | Liga SecureStore (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`) e `expo-crypto` à inicialização |
| `src/components/ui/app-error.tsx` + `ErrorBoundary` em `_layout.tsx` | Falha ao abrir → tela em pt-BR, sem detalhes técnicos, com "Tentar de novo" |
| `src/db/__tests__/*` | 19 testes; migrations testadas em SQLite real via `node:sqlite` |
| `jest.config.js` | Projetos `app` (jest-expo) e `db` (Node) |

## Acceptance Criteria Results

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 Chave única no secure-store | PASS | key.test.ts (6 testes) |
| AC-2 Migrations versionadas e atômicas | PASS | migrations.test.ts (8): ordem, idempotência, parcial, rollback com user_version preservado, lista inválida |
| AC-3 Abertura segura | PASS | database.test.ts (5): chave é a 1ª instrução, ordem cipher→fk→migrations, cipher vazio/nulo falha sem migrar, chave inválida não executa nada nem vaza |
| AC-4 Criptografia no aparelho | PASS | cabeçalho `dcef 90fa 4aaa b5a1…` (não "SQLite format 3"); arquivo de 12 KB; `node:sqlite` → "file is not a database"; `strings` sem "app_meta" |
| AC-5 Qualidade | PASS | npm test, tsc, lint limpos |

## Deviations

| Deviation | Why | Impact |
|-----------|-----|--------|
| 1º rebuild saiu **sem** SQLCipher | `expo run:android` não reaplica config plugins num `android/` já existente | A trava `DatabaseNotEncryptedError` disparou como projetado (nada gravado; arquivo de 0 bytes). Correção: `npx expo prebuild --platform android` antes do build. **Regra:** mudou plugin em app.json → prebuild |
| `@types/node` em `tsconfig.types` | `node:sqlite` no adaptador de teste | Tipos de Node visíveis no app (sem efeito em runtime) |
| `ErrorBoundary` do expo-router em vez de `onError` do provider | `SQLiteProvider` chama `onError` durante o render; boundary é o caminho suportado | — |
| Arquivo `.db` vazio removido via `run-as` antes do 2º build | Limpeza do arquivo de 0 bytes criado na tentativa sem cipher | Nenhum dado existia |

## Key Decisions

- `withExclusiveTransactionAsync` proibido (abre conexão sem a chave).
- Chave como bytes brutos `x'<hex>'` (sem KDF), validada por regex antes do PRAGMA.

## Skill Audit

| Expected | Invoked |
|----------|---------|
| test-driven-development | ✓ (RED observado antes de cada módulo) |
| verification-before-completion | ✓ |

## Next

01-03: logger seguro, aviso médico e "Apagar todos os dados".

---
*Completed: 2026-10-22*
