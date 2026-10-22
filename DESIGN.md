---
name: Ciclo Livre
description: Acompanhamento de ciclo grátis e privado, desenhado como um mapa de territórios
colors:
  water: "#F5F1E4"
  water-night: "#151A17"
  ink: "#2C2E2A"
  ink-night: "#F2EEE1"
  ink-muted: "#5B5E57"
  ink-muted-night: "#B9B5A8"
  line: "#D9D5C8"
  line-night: "#3A3F3B"
  land: "#8ED462"
  land-night: "#7BC04F"
  coral: "#FF705D"
  coral-night: "#ff7a66"
  sun: "#F5E211"
  sun-night: "#EBD70F"
  pond: "#2BA0FF"
  pond-night: "#3aa6ff"
  lilac: "#EBC1FF"
  lilac-night: "#D9A9F2"
typography:
  display:
    fontFamily: "Roboto (sistema)"
    fontSize: "44sp"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.04em"
  hero:
    fontFamily: "Roboto (sistema)"
    fontSize: "56sp"
    fontWeight: 700
    lineHeight: 0.96
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Roboto (sistema)"
    fontSize: "32sp"
    fontWeight: 700
    lineHeight: 1.06
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Roboto (sistema)"
    fontSize: "22sp"
    fontWeight: 700
    lineHeight: 1.15
  body:
    fontFamily: "Roboto (sistema)"
    fontSize: "16sp"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Roboto (sistema)"
    fontSize: "14sp"
    fontWeight: 700
    letterSpacing: "0.02em"
rounded:
  capsule: "9999px"
  card: "28px"
spacing:
  gutter: "20px"
  stack: "12px"
  section: "32px"
components:
  capsule-primary:
    backgroundColor: "{colors.sun}"
    textColor: "{colors.ink}"
    rounded: "{rounded.capsule}"
    height: "56px"
    padding: "0 8px 0 24px"
  capsule-outline:
    backgroundColor: "{colors.water}"
    textColor: "{colors.ink}"
    rounded: "{rounded.capsule}"
    height: "48px"
  phase-chip:
    textColor: "{colors.ink}"
    rounded: "{rounded.capsule}"
    padding: "6px 14px"
---

# Design System: Ciclo Livre

<!--
DIRECTION CONTRACT (2026-10-22, seed b705dbc7, mundo escolhido pela pessoa usuária: "Território do Ciclo")
THESIS: o ciclo é um mapa de territórios de cor chapada, e o dia de hoje é o território em que você está. Recusa o anel pastel com flores, que é o padrão da categoria, e o painel clínico branco.
OWN-WORLD: lobos orgânicos de cor chapada (verde-terra, coral, sol, lago, lilás) sobre "água" clara ou noturna, tinta grafite, uma grotesca em display apertado, controles em cápsula com um chip redondo na ponta, sem sombras.
STORY: a pessoa abre o app, vê em que território está hoje, entende o que vem pelo litoral seguinte e registra em segundos.
FIRST VIEWPORT (Hoje): um lobo dominante sai do quadro por dois lados; o título em display fica sobre a água; a cápsula de ação fica na zona do polegar.
FORM: alternativa fundida "aww2-zoo-gardens-guide-map", escolhida pela pessoa no lugar da 3ª direção sorteada (folha de gráfico). Encenação: uma tela, um lobo dominante.
-->

## Overview

**Creative North Star: "O Mapa do Corpo"** (provisório, a confirmar com a pessoa usuária)

Cada fase do ciclo é um território com cor própria, como num mapa-guia de parque: menstruação, folicular, fértil e lútea. A interface é chapada e generosa:
- cor ocupando regiões inteiras, nunca em detalhes espalhados;
- uma grotesca forte para nomes;
- cápsulas para agir.

É um app de Operar: a expressão vive na escala e na cor, nunca escondendo a tarefa (registrar, consultar a previsão, entender o padrão). Segue Material 3 na estrutura: barra de navegação inferior, Back do sistema, alvos de 48dp e tipografia em sp.

Rejeitado de forma explícita: identidade do Clue (anel, cores e textos), pastel com flores, painel clínico, cadeados e telas de compra.

**Key Characteristics:**
- Lobos de cor chapada saindo do quadro, sem gradiente, textura ou sombra.
- Fase nunca comunicada só pela cor: sempre com rótulo de texto.
- Uma família tipográfica (Roboto do sistema), com peso 700 para display, títulos e rótulos e 400 para o corpo.
- Cápsulas com chip redondo à direita, que cruza para a esquerda quando ativo.

## Colors

Paleta de mapa-guia: terra, sol, coral, lago e lilás sobre água.

| Papel | Claro | Escuro | Uso |
|---|---|---|---|
| Água (fundo) | `water` #F5F1E4 | `water-night` #151A17 | Fundo de todas as telas |
| Tinta | `ink` #2C2E2A | `ink-night` #F2EEE1 | Texto; também o texto sobre qualquer lobo, nos dois modos |
| Tinta suave | `ink-muted` | `ink-muted-night` | Texto secundário sobre a água |
| Coral | `coral` | `coral-night` | Território **menstruação** |
| Lago | `pond` | `pond-night` | Território **folicular** |
| Terra | `land` | `land-night` | Território **fértil** |
| Lilás | `lilac` | `lilac-night` | Território **lútea** |
| Sol | `sun` | `sun-night` | Ação primária (cápsula) e lobo de Hoje quando não há fase (gravidez, sem dados) |

Mapeamento para os papéis Material 3:
- primary = sol, on-primary = tinta;
- surface = água;
- os containers são os territórios.

Sobre lobo colorido, o texto é sempre `ink` (#2C2E2A), também no modo escuro, porque os lobos continuam saturados. Contraste do `ink` sobre os lobos: ≥ 4.9:1 nos dois modos (pior caso: lago claro 4.95:1; coral-night 5.37:1; pond-night 5.28:1).

**Lobos das abas (casca):** cada aba tem um território fixo para orientação (Hoje = sol, Calendário = lago, Análise = lilás, Explorar = terra, Mais = coral). Ali o lobo identifica o lugar, não uma fase, e nunca aparece sem o nome da tela. Quando uma tela mostrar a fase do ciclo (Hoje, a partir da fase 4), a cor da fase vem sempre com rótulo.

Fonte da verdade em código: as classes vêm de `src/global.css` (`@theme`); cores usadas em JS (SVG, NativeTabs) vêm de `src/constants/theme.ts`, que espelha estes valores.

## Typography

- **Hero:** 56sp, peso 700, só o nome do app na boas-vindas; uma linha que encolhe para caber.
- **Headline:** 32sp/700, a pergunta de cada passo do onboarding e de telas de formulário.
- **Display:** 44sp, peso 700, entrelinha 42 (≈0.95), tracking -0.04em; uma linha, encolhe para caber com fonte grande. Usado só para o nome da tela e o número do dia do ciclo.
- **Title:** 22sp/700. **Body:** 16sp/400, entrelinha 1.45. **Label:** 14sp/700 nas cápsulas e chips.
- Algarismos tabulares sempre que houver números comparáveis (dias, temperaturas), inclusive nos valores grandes das estatísticas.
- Tudo escala com a fonte do sistema (sp): nada de tamanho fixo que quebre com a fonte grande.

## Layout

- Margem lateral de 20dp, pilha de 12dp e seção de 32dp. Há mais espaço acima de um título do que abaixo.
- Composição "um lobo domina": cada tela de aba tem um território principal sangrando por duas bordas e conteúdo sobre a água ou dentro do lobo.
- **Exceção — telas de pergunta, formulário e registro** (passos do onboarding, edição de perfil, registro do dia): só água, headline e controles. Sem lobo, para a pergunta ser a única coisa na tela. A boas-vindas mantém um lobo de sol (começo = "hoje").
- Dentro de um lobo fica só o título (que encolhe para caber); texto de apoio fica na água, para crescer com a fonte do sistema sem sair do território.
- Ação primária na metade inferior, na zona do polegar.
- Edge-to-edge com insets de sistema (safe area) em todas as telas.

## Elevation & Depth

Plano. Não há sombras. A profundidade vem da sobreposição de territórios (um lobo sobre outro, ou um lobo vazado deixando a água aparecer).

## Shapes

- **Lobos:** paths SVG orgânicos (`src/components/ui/lobe.tsx`), com bordas suaves e nunca geométricas.
- **Cápsulas:** totalmente arredondadas (`rounded-full`), com altura mínima de 48dp.
- **Cartões**, quando inevitáveis: raio de 28dp e contorno de 1.5dp em `ink`, sem preenchimento cinza. Nunca cartões aninhados.

## Components

- **Barra de navegação:** NativeTabs (Material); o indicador ativo usa o tom de terra; ícones Material Symbols.
- **Cápsula primária:** sol, rótulo em `ink` e chip redondo de `ink` com seta à direita; 56dp. **Desabilitada:** contorno tracejado em `ink-muted`, rótulo `ink-muted`, sem chip (sol translúcido fica ilegível no escuro).
- **Cápsula de contorno:** borda de 1.5dp em `ink`, sem fundo.
- **Chip de fase:** cápsula pequena na cor do território, com o nome da fase sempre escrito.
- **Escolha única (rádio):** linhas de contorno 1.5dp, raio 28dp, ≥56dp. Selecionada = preenchida de `ink` (texto em `water`) com check num círculo de sol. Nunca cor de fase.
- **Chip de opção (registro):** cápsula de contorno 1.5dp, ≥48dp, rótulo 14sp/700 nos dois estados (a largura não muda ao marcar); selecionado = `ink` cheio com texto `water`. Rádio (escolha única) ou caixa (várias); nome acessível "Categoria: opção". Salva ao toque.
- **Campo de medição:** cápsula de contorno com o número à esquerda e a unidade em `ink-muted` à direita; salva enquanto digita (quando válido). Erro: contorno 3dp + texto "Erro: …" em negrito, aparecendo após uma pausa (no Android fechar o teclado não tira o foco).
- **Ajuste numérico:** cápsula de contorno com botões redondos de `ink` (− e +) e o valor no meio, que é o elemento "ajustável" para o TalkBack.
- **Campo de data:** cápsula de contorno com a data por extenso; abre o diálogo nativo do Android tingido de tinta (plugin `with-android-accent`).
- **Progresso de passos:** "Passo N de M" + segmentos de 8dp: feitos em `ink` cheio, restantes em contorno de `ink`.
- **Linha de navegação:** rótulo, detalhe em `ink-muted` e seta; ≥64dp; divisória de 1dp em `line`/`line-night` (decorativa; nunca o único sinal de algo).
- **Nota técnica:** o modificador de opacidade do Tailwind (`bg-ink/15`) não funciona no NativeWind 5 RC; use tokens com hex explícito.
- **Snackbar:** retângulo `ink` (texto `water`), raio 20dp, acima da barra de abas, anunciado ao TalkBack, some em 4s. Nunca toast.
- **Calendário:** menstruação = coral cheio; janela fértil = terra cheia; **previsto = mesma cor + contorno tracejado de 2dp em `ink`** (cor clara sozinha não atinge 3:1 na água); ovulação = anel de 2,5dp em `ink`; hoje = número em negrito sublinhado; registrado = ponto `ink` abaixo; fora do mês = `ink-muted` (sem opacidade). Dias futuros desativados. Nome acessível por dia: "22 de outubro, janela fértil prevista, ovulação estimada, com registro". Legenda sempre escrita.
- **Chip de status** (ex.: "Em construção"): cápsula de contorno, sem cor de território.
- **Estatística:** valor primeiro (24sp/700, algarismos tabulares, uma linha que encolhe para caber) e rótulo embaixo (14sp/700 em `ink-muted`). Um único foco no TalkBack ("Ciclo médio: 29 dias"). Logo abaixo, sempre: "Com base em N ciclos completos", porque a média com poucos ciclos não pode ter o mesmo peso que com muitos.
- **Gráficos:** sem paleta categórica.
  - **Barras:** em `ink-muted`; a destacada ou tocada em `ink`. Começam no zero, ponta de 4dp só em cima, base reta. A linha de referência tem 1dp em `ink`. Na base de cada barra, uma faixa coral com os dias de menstruação, com a legenda escrita.
  - **Rótulo:** fica acima do gráfico e anuncia a barra tocada (região "polite"). Sem toque, mostra a destacada com "· último ciclo completo".
  - **Alvos de toque:** a coluna inteira; selecionado também no TalkBack.
  - **Linhas:** traço de 2dp em `ink` e pontos de 8dp com contorno de `water`. A linha de cobertura é tracejada em `ink-muted`; a ovulação tem uma marca vertical.
  - **Resumo:** cada gráfico tem um resumo acessível, e a tabela (histórico) é a versão em texto.
- **Linha de histórico ou de sintoma:** pelo menos 56dp, com divisória de 1dp em `line`. Fase em chip de fase com o nome escrito. A linha inteira é um foco só no TalkBack.
- **Véu da barra de status (telas com lobo):** quando a borda do lobo passa por baixo da barra de status, aparece um véu em `water`/`water-night` da altura da barra de status, e os ícones passam a seguir o tema. Sobre o lobo, os ícones são escuros. Só a aba em foco controla a barra de status.
- **Movimento** (a implementar nas fases seguintes): 0.4s com leve overshoot nas transições de território; respeita "remover animações" do sistema.

## Do's and Don'ts

- **Faça:** cor em regiões inteiras; rótulo junto de toda cor de fase; tinta escura sobre lobos; textos na voz inclusiva do PRODUCT.md.
- **Não faça:**
  - cadeados, blur de conteúdo, telas de compra ou "Plus";
  - gradientes, sombras ou glass;
  - cinza sobre lobo colorido (use `ink`);
  - mais de um lobo dominante por tela;
  - cópia de qualquer elemento do Clue.
