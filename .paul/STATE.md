---
description: "Ciclo Livre — current position and accumulated context"
type: ProjectState
about: "ciclo-livre"
---

# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-10-22)

**Core value:** Qualquer pessoa registra o ciclo e recebe previsões, análises e relatórios completos sem pagar e sem entregar dados de saúde reprodutiva a ninguém.
**Current focus:** v0.2 O que o Flo tem a mais — Fase 16 (Status do modo Engravidar + chance por dia)

## Current Position

Milestone: v0.2 O que o Flo tem a mais
Phase: 16 of 19 (Status do modo Engravidar + chance por dia)
Plan: 16-01 completo
Status: Fase completa
Last activity: 2026-10-25 — Fase 16 completa

Progress:
- v0.1 Initial Release: [██████████] 100% (falta publicar na Play e /paul:complete-milestone)
- v0.2 O que o Flo tem a mais: [██████░░░░] 62%

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Fase completa]
```

## Accumulated Context

### Decisions
| Decision | Phase | Impact |
|----------|-------|--------|
| Local-first, sem conta; IA BYOK; Android primeiro | Init | Sem backend; Connect/comunidade fora da v0.1 |
| NativeWind 5 RC + Tailwind 4.3; lightningcss 1.30.1 | Init | Validado no aparelho (01-01); fallback descartado |
| Resolver do Metro: expo-asset/expo-image usam react-native original | 01-01 | react-native-css RC não exporta AssetRegistry (RN 0.88); revisitar no estável |
| Mudou plugin no app.json → `npx expo prebuild --platform android` antes do build | 01-02 | `expo run` não reaplica plugins em android/ existente |
| Aparelho de teste: Galaxy S21 FE `RQCRC00WJMV` (S21 Ultra é de outra sessão) | 01-03 | Usar `-s RQCRC00WJMV` / `--device RQCRC00WJMV` |
| "Sintomas frequentes" exclui estados neutros/bons por opção | 05 | Corrimento normal, energia boa etc. não viram sintoma |
| Lembretes com alarme inexato (sem SCHEDULE_EXACT_ALARM) | 06 plan | Play restringe alarme exato; horário pode variar minutos |
| Notificações discretas ligadas por padrão | 06 | Android ignorou SECRET no canal; texto de saúde só se a pessoa escolher |
| Drive via compartilhar/SAF (sem OAuth) | 07 plan | Sem projeto Google Cloud; backup automático adiado |
| `.prettierrc` (aspas simples, 140 col.) | 06 | Evita reformatar o projeto com padrões errados |
| Artigos escritos pelo app com a skill no-ai-slop, rodapé "sem revisão profissional" | 08 plan | Decisão do usuário |
| IA BYOK: Claude primeiro, chave no secure-store, consentimento explícito | 08 plan | Decisão do usuário |
| Importar do Clue (ZIP com senha + measurements.json), juntando sem apagar | 08 plan | Requisito do usuário |
| Leitor de ZIP próprio (JS puro, AES/ZipCrypto); zip.js só nos testes | 08-03 | zip.js depende de Workers/crypto.subtle no Hermes |
| CSV com `;` entre colunas e vírgula decimal | 07 | Excel pt-BR abre direto; mudar quebra quem importa |
| Temporários de exportação ficam em `cache/exportar` até a próxima exportação ou "apagar tudo" | 07 | Drive/Gmail leem depois do menu; pasta privada e fora do backup |
| Restaurar na primeira abertura sem confirmação (não há dados para substituir) | 07 | Ver também a importação do Clue no onboarding |
| scrypt N=2^13 no backup (JS); senha mínima 12 + gerador de 100 bits | 07 / 08-04 | Troca de segurança registrada; KDF nativo na fase 11 |
| Datas de fora: entrada 1900–2100, contas 1800–2299 | 08-04 | Arquivo/link com ano 9999 não quebra o app |
| App fora do backup do Android (plugin with-no-backup); lembretes com id opaco | 08-04 | Agenda de notificações fica em texto puro no Android |
| Chat com dados: contexto montado no aparelho e mostrado igual antes do envio; histórico só no SQLCipher; consentimento próprio | 09 plan | Paridade com o Clue sem servidor |
| Revogar consentimento do chat ou mudar o escopo apaga a conversa | 09 review | Respostas antigas não voltam a sair sob outro consentimento |
| "Me pague um café" (Pix) como último item de Mais; app grátis e sem anúncios | 09 | Pedido da pessoa usuária |
| Health Connect: só leitura, 30 dias, app vence no mesmo dia; react-native-health-connect 4.1.3 (plugin próprio); minSdk 26 | 10 plan | Phones abaixo do Android 8 deixam de ser suportados |
| Origem do Health Connect por dia/categoria (`health_origin`, v7): reimport atualiza só o que ainda é dele | 10 review | Edição ou exclusão da pessoa sempre vence |
| Desconectar o Health Connect também revoga a permissão (vale após reiniciar; o app para de ler na hora) | 10 review | Recomendação da biblioteca + privacidade |
| Ícones alternativos por plugin + módulo local, MainActivity sempre habilitada | 11 plan | Libs prontas quebram deep link/notificação |
| Release local assinado com chave própria (EAS só se a pessoa fizer login) | 11 plan | Checkpoint para guardar a chave |
| Trava: credencial do aparelho, decisão por tempo (1 min; 5 min com teto se saiu por tela do sistema); sem PIN no aparelho desliga em vez de trancar | 11-01 review | Nunca tranca a pessoa fora dos próprios dados |
| Política de privacidade: só fatos verificados no código, com teste; módulo local launch-intent para o link do Health Connect | 11-01 | Mudou o app → revisar a política e a data |
| FLAG_SECURE por módulo local (secure-window), sem expo-screen-capture | 11-02 | DETECT_SCREEN_CAPTURE bloqueada; depois de mexer em permissões, abrir o app no aparelho |
| Ícones: plugin + módulo app-icon; troca ao sair do app; Discreto com abertura neutra (Android 13+) e notificação sempre com o caderno | 11-02 | Ao trocar, o Android tira o app dos recentes |
| Código aberto GPL-3.0 em github.com/albornozrodrigo/ciclo-livre (contato da política); README/CONTRIBUTING para a comunidade | 2026-10-23 | Decisão da pessoa usuária |
| Chave de upload em `credentials/` + `credentials.json` (gitignored) neste Mac; EAS com credenciais locais | 2026-10-23 | Decisão da pessoa usuária; fazer cópia de segurança fora do repo |
| Site em site/ na Vercel (raiz do projeto = site/, deploy a cada push na main); política do site gerada do app | 11-05 | Mudou a política → `node scripts/build-site.mjs` e push |
| Milestone v0.2 = 8 itens de prioridade 1 do estudo do Flo (`../estudo-rea-flo/notas/05`), tudo local e grátis | v0.2 | Comparação de gating do Flo vem de um APK modificado (isPremium forçado); usar só o inventário |
| Calendário: lista vertical de meses (passado acima, futuro sem limite, abre no mês atual) no lugar das setas | 2026-10-25 | getItemLayout com alturas fixas por mês |
| North Star "O Mapa do Corpo" | 01-01 | Provisório — confirmar com a pessoa usuária |

### Deferred Issues
| Issue | Origin | Effort | Revisit |
|-------|--------|--------|---------|
| Botão "denunciar resposta" no chat de IA, se a revisão da Play pedir (política de IA generativa) | 11-05 | S | Na revisão da Play |
| /cso completo antes do release (runs da fase 8 parciais pelo teto de tempo; OWASP manual feito em 2026-10-23) | 08 | S | Antes do release |
| KDF nativo (scrypt em JS limita N a 2^13–2^15) | 08-04 | M | Fase 11 |
| Build de release assinado com a chave de debug; permissões SYSTEM_ALERT_WINDOW/armazenamento | OWASP 08 | S | Fase 11 |
| KDF nativo para backup < 3 s (hoje scrypt 2^13 em JS ≈ 6,7 s no S21 FE) | 07 | M | Fase 11 |
| Backup automático no Drive (OAuth/Drive API) | 07 plan | L | Só se pedido |
| Visibilidade SECRET por notificação: Android ignora a do canal (comprovado no S21 FE); só com patch no nativo do expo-notifications | 06 / 11-03 | M | Só se pedido |
| Teste instável `readZipEntry › ZipCrypto` (1 falha em 4 rodadas completas) | 11-04 | S | Investigar |
| `npm audit`: 33 high de `braces`/`node-forge` só em ferramentas de build, sem correção publicada | OWASP 08 | S | Reavaliar a cada atualização do SDK |
| Trava do app (biometria/PIN) + FLAG_SECURE / ocultar miniatura em Recentes | /cso + OWASP 08 | M | Fase 11 |
| Prova de conversa real do chat no aparelho (falta chave da Anthropic no S21 FE) | 09-02 | S | Quando houver chave |
| /cso da fase 10 ficou parcial (finish encadeado após submit recusado); coberto por revisão manual | 10 | S | /cso completo antes do release |

### Blockers/Concerns
None yet.

## Boundaries (Active)

- metro.config.js (exceto a correção documentada do resolver), postcss.config.mjs, nativewind-env.d.ts e versões fixadas (nativewind/react-native-css/tailwindcss/lightningcss)
- android/ (gerado — CNG)

## Session Continuity

Last session: 2026-10-25
Stopped at: 2026-10-25 — Fase 16 completa
Next action: /paul:plan da fase 17 (Pode aparecer hoje)
Resume file: .paul/ROADMAP.md

---
*STATE.md — Updated after every significant action*
