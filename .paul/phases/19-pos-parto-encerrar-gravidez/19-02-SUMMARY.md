---
phase: 19-pos-parto-encerrar-gravidez
plan: 02
status: complete
completed: 2026-10-25
type: Summary
about: "ciclo-livre"
---

# 19-02: Encerrar gravidez, gêmeos e sugestão depois do teste positivo

## O que foi feito
- **`src/domain/pregnancy-end.ts` (`endPregnancy`):**
  - "o bebê nasceu" leva ao pós-parto com a data do parto;
  - "terminou de outra forma" leva a "Menstruação e ciclo";
  - nos dois casos zera a data prevista, os gêmeos e a menstruação de antes da gravidez.
- **Tela `perfil/encerrar-gravidez`:**
  - escolha entre as duas opções;
  - data do parto no nascimento;
  - na outra opção, acolhimento curto, sem pedir detalhe, com o serviço de saúde e o CVV 188;
  - usa a validação de edição do perfil e volta para as abas com `dismissTo`.
  - Entradas: botão no card de gravidez em Hoje e item em Mais (só no modo gravidez).
- **Gêmeos:** `Profile.twins` (migration v11; backup com ausência = false, normalizado fora da gravidez), interruptor na troca de modo, "Gestação de gêmeos" em Hoje e no chat.
- **Teste positivo:** o registro de hoje com "Gravidez: positivo" ou "linha fraca" mostra um cartão discreto que leva à troca de modo. Só aparece fora dos modos gravidez e pós-parto.

## Acceptance Criteria
| AC | Resultado | Evidência |
|----|-----------|-----------|
| AC-1 encerrar | PASS | `pregnancy-end.test` (nascimento; outra forma), `encerrar-gravidez.test` (acolhimento, salva, volta às abas; nascimento pede data) |
| AC-2 gêmeos | PASS | `profile-repo.test` (ida e volta), `export-repo.test` (ausente = false; schema 11), Hoje e chat por tipo |
| AC-3 sugestão | PASS | `registro.test` (oferece fora da gravidez; não no pós-parto) |

## Revisão (subagente) e correções
1. **"O bebê nasceu" travava sem aviso** com a menstruação de antes da gravidez com mais de um ano. Agora a data é zerada também no nascimento, e a tela usa `validateProfileEdit`.
2. **`router.replace` podia duplicar as abas na pilha:** agora usa `dismissTo('/(tabs)')`.
3. **O cartão de teste positivo aparecia no pós-parto:** agora fica escondido.
4. **Backup com gêmeos fora da gravidez:** agora é normalizado.

## Pendências (anotadas no STATE)
- O cartão de teste positivo ainda pode aparecer nas semanas seguintes a uma perda, porque o app não guarda a data do fim da gravidez. Isso pede cuidado de produto.
- Um artigo próprio sobre perda gestacional precisa de cuidado editorial e ficou fora.

## Verificação
- `npx jest`: 114 suítes, 994 testes passando; `tsc` e `lint` sem erros.
- Não testei este plano no aparelho (emulador ou S21 FE). As telas estão cobertas por testes de componente.
