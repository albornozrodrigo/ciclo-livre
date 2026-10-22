---
phase: 03-registro
plan: 02
completed: 2026-10-22T20:20:00Z
duration: ~1h30
description: "Registrar o dia: chips que salvam ao toque, medições e nota com autosave, resumo agrupado em Hoje; integração testada com SQLite real e provada no S21 FE"
type: Summary
about: "ciclo-livre"
---

# Phase 3 Plan 02: Registrar o dia — Summary

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 Hoje → registro | PASS | `hoje.test.tsx`; aparelho: vazio → "Registrar hoje" → resumo "Dor: Cólica · Intensidade da dor: Forte · Temperatura basal: 36,6 °C · Nota do dia" |
| AC-2 Tela do dia | PASS | `registro.test.tsx` (categorias por modo/método, single/multi, carregar existente) |
| AC-3 Medições e nota | PASS | autosave com debounce + flush ao sair; erro após pausa; vírgula preservada |
| AC-4 Integração SQLite real | PASS | `node:sqlite` via mock de `useSQLiteContext` |
| AC-5 Aparelho + qualidade | PASS | S21 FE; 221→232 testes, tsc, lint, detector `[]`; finish review aplicado |

## Bugs achados no aparelho / revisão
1. **Android: fechar o teclado não tira o foco** → salvar-ao-sair nunca disparava; autosave com debounce (`useDebouncedSave`) e flush ao desmontar.
2. Vírgula apagada ao salvar valor parcial ("36," → "36") → ressincroniza só se o texto não representa o valor.
3. Erro de medição nunca aparecia sem blur → aparece após pausa; contorno 3dp + "Erro:".
4. Nome acessível "Leve" ambíguo (Menstruação × Intensidade) → "Categoria: opção".
5. Resumo ambíguo ("Forte", "Bem · Bem") → agrupado por categoria, na ordem do catálogo.
6. Falha ao salvar desfazia o dia inteiro → desfaz só o campo (setState funcional).
7. Rótulos no feminino ("Esgotada", "Ansiosa") → substantivos neutros.
8. Chips mudavam de largura ao marcar → mesmo peso nos dois estados.

## Deferred
- Erro de medição fica atrás do teclado (TalkBack anuncia; contorno visível) — rolar até o campo no futuro.
- Marcador de sol "hoje" no título do registro e check de sol nos chips (finish review: teto, não piso).
