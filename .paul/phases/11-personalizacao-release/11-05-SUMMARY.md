---
phase: 11-personalizacao-release
plan: 05
completed: 2026-10-23T22:10:00Z
duration: ~3h (com site e guia da Play)
description: "Release v0.1.0: KDF nativo, permissões mínimas, AAB/APK assinados com chave própria via EAS, /cso completo"
type: Summary
about: "ciclo-livre"
---

# Phase 11 Plan 05: Release — Summary

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 KDF nativo | PASS | scrypt de react-native-quick-crypto 1.1.8, N=2^15 (r=8, p=1): 0,67 s no S21 FE. Backups N=2^13 do noble continuam abrindo; vetor RFC 7914 igual nos dois (teste) |
| AC-2 Permissões | PASS | APK de release (aapt2): sem SYSTEM_ALERT_WINDOW, READ/WRITE_EXTERNAL_STORAGE, USE_FINGERPRINT, BIND_GET_INSTALL_REFERRER_SERVICE, c2dm, DETECT_SCREEN_CAPTURE. RECEIVE_BOOT_COMPLETED mantida para os lembretes |
| AC-3 Build de release | PASS com desvios | EAS (perfis `preview` APK e `production` AAB) com `credentialsSource: local`; chave em `credentials/` + `credentials.json`, ambos no .gitignore (decisão da pessoa usuária, no lugar de ~/keys). APK e AAB assinados com a chave de upload (SHA-256 FD:CF:EB:45…E0:E6, apksigner/jarsigner). versionCode 1, 0.1.0, targetSdk 36. zipalign -P 16 OK e as 33 .so arm64 com LOAD ≥ 16 KB. **Desvio:** o release foi aberto no emulador (Android 17: onboarding, fechar e reabrir com dados mantidos), não no S21 FE, para não desinstalar o dev build e apagar os dados de teste do aparelho |
| AC-4 Segurança | PASS (parcial do helper) | /cso completo run 1792789452444-5cb95c0982f12abf: parcial, sem achados sustentados; imagens de scanner indisponíveis e histórico do git acima do limite do helper |

## Também entregue
- Site em https://ciclo-livre.vercel.app (pasta `site/`, publicação automática a cada push na `main`; política em /privacidade gerada de `src/content/privacy-policy.ts` por `scripts/build-site.mjs`).
- Imagens da Play em `store/` e guia `docs/PUBLICAR-PLAY-STORE.md`.

## Problemas
- Primeiro build EAS falhou no bundle eager (`web.output: server` e `Appearance.setColorScheme` no web) → corrigido em 9664707.
- `vercel link` conectou o GitHub com raiz `.`: o push publicou a raiz do repositório (404). Raiz do projeto trocada para `site/`.

## Próximo
- A pessoa usuária sobe o AAB na Play (conta anterior a 11/2023: teste interno → produção).
- Pendências registradas em STATE (teste instável do ZipCrypto, botão de denunciar resposta da IA se a Play pedir).
