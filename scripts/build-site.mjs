// Gera site/privacidade/index.html a partir de src/content/privacy-policy.ts (fonte única da política).
// Uso: node scripts/build-site.mjs   (Node 23+ lê TypeScript direto)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { PRIVACY_POLICY } = await import(join(root, 'src/content/privacy-policy.ts'));

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// O link do repositório aparece como texto na política do app; no site vira link.
const linkify = (s) =>
  esc(s).replace(
    'github.com/albornozrodrigo/ciclo-livre',
    '<a href="https://github.com/albornozrodrigo/ciclo-livre">github.com/albornozrodrigo/ciclo-livre</a>',
  );

const body = PRIVACY_POLICY.blocks
  .map((b) => {
    if (b.kind === 'h') return `<h2>${esc(b.text)}</h2>`;
    if (b.kind === 'sub') return `<h3>${esc(b.text)}</h3>`;
    if (b.kind === 'list') return `<ul>${b.items.map((i) => `<li>${linkify(i)}</li>`).join('')}</ul>`;
    return `<p>${linkify(b.text)}</p>`;
  })
  .join('\n        ');

const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(PRIVACY_POLICY.title)}</title>
    <meta name="description" content="Como o app Ciclo Livre trata os seus dados: tudo fica no celular, num banco criptografado, sem conta, servidor, anúncios ou analytics." />
    <meta name="theme-color" content="#F5F1E4" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#151A17" media="(prefers-color-scheme: dark)" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <!-- Gerado por scripts/build-site.mjs a partir de src/content/privacy-policy.ts. Não edite à mão. -->
    <header class="top">
      <a class="brand" href="/" aria-label="Ciclo Livre, início"><img src="/favicon.svg" alt="" width="36" height="36" />Ciclo Livre</a>
      <nav aria-label="Principal"><a href="https://github.com/albornozrodrigo/ciclo-livre">GitHub</a></nav>
    </header>
    <main class="read" id="conteudo">
      <div class="lobe" aria-hidden="true"><svg viewBox="0 0 400 400"><path fill="currentColor" d="M200 8C284 4 380 60 392 150C402 226 340 262 350 330C360 398 270 410 200 388C124 364 30 380 10 300C-8 228 52 196 46 128C40 58 120 12 200 8Z" /></svg></div>
      <article>
        <h1 class="display">${esc(PRIVACY_POLICY.title)}</h1>
        <p class="effective">Em vigor desde ${esc(PRIVACY_POLICY.effective)}</p>
        ${body}
      </article>
    </main>
    <footer>
      <div><p><strong>O Ciclo Livre não é método contraceptivo nem dispositivo médico.</strong> Para maiores de 18 anos.</p></div>
      <div class="foot-links"><a href="/">Início</a><a href="https://github.com/albornozrodrigo/ciclo-livre">GitHub</a></div>
    </footer>
  </body>
</html>
`;

const out = join(root, 'site/privacidade/index.html');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log('ok', out);
