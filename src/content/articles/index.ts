// Gerado a partir do rascunho revisado com a skill no-ai-slop. Edite o texto aqui mesmo.
import type { Article } from '../search';

/** Artigos próprios do Ciclo Livre (pt-BR), empacotados no app. Sem revisão de profissional de saúde. */
export const ARTICLES: Article[] = [
  {
    id: 'o-que-e-o-ciclo',
    topic: 'ciclo',
    title: 'O que é o ciclo menstrual',
    summary: 'O ciclo vai do primeiro dia de uma menstruação até o dia anterior à próxima.',
    minutes: 3,
    blocks: [
      {
        kind: 'p',
        text: 'O ciclo menstrual começa no primeiro dia de sangramento e termina no dia anterior à menstruação seguinte. O Ciclo Livre conta como dia 1 o primeiro dia de menstruação; escape não conta.',
      },
      {
        kind: 'p',
        text: 'Em pessoas adultas, a Federação Internacional de Ginecologia e Obstetrícia (FIGO) considera dentro do esperado ciclos de 24 a 38 dias, com menstruação de até 8 dias. Variar alguns dias de um mês para o outro também é comum.',
      },
      {
        kind: 'h',
        text: 'O que acontece por dentro',
      },
      {
        kind: 'list',
        items: [
          'Os hormônios do cérebro estimulam os ovários a amadurecer um folículo.',
          'O folículo produz estrogênio, e o revestimento do útero engrossa.',
          'Na ovulação, um óvulo é liberado. Depois disso, a progesterona sobe.',
          'Se não há gravidez, os hormônios caem e o revestimento sai: é a menstruação.',
        ],
      },
      {
        kind: 'h',
        text: 'Por que registrar ajuda',
      },
      {
        kind: 'p',
        text: 'Com alguns ciclos registrados, dá para ver quanto o seu ciclo costuma durar e quanto ele varia. A previsão do app melhora a cada ciclo e mostra a margem de erro junto com a data.',
      },
    ],
    sources: [
      'FIGO (sistemas de classificação de sangramento uterino, 2018)',
      'Ministério da Saúde, Caderno de Atenção Básica — Saúde Sexual e Reprodutiva',
    ],
  },
  {
    id: 'fases-do-ciclo',
    topic: 'ciclo',
    title: 'As fases do ciclo',
    summary: 'Menstruação, fase folicular, janela fértil e fase lútea: o que muda em cada uma.',
    minutes: 4,
    blocks: [
      {
        kind: 'p',
        text: 'O app divide o ciclo em quatro partes. As cores das fases são as mesmas no calendário e em Hoje.',
      },
      {
        kind: 'h',
        text: 'Menstruação',
      },
      {
        kind: 'p',
        text: 'Os primeiros dias do ciclo. O sangramento costuma durar de 3 a 7 dias. Cólica, cansaço e dor nas costas são comuns.',
      },
      {
        kind: 'h',
        text: 'Fase folicular',
      },
      {
        kind: 'p',
        text: 'Vai do fim da menstruação até perto da ovulação. O estrogênio sobe e muita gente sente mais energia. É a parte do ciclo que mais varia de tamanho: é por causa dela que um ciclo tem 26 dias e o seguinte tem 31.',
      },
      {
        kind: 'h',
        text: 'Janela fértil',
      },
      {
        kind: 'p',
        text: 'Os cerca de 6 dias em que uma relação sexual pode levar a uma gravidez: os 5 dias antes da ovulação e o próprio dia. O espermatozoide vive até 5 dias no corpo; o óvulo, cerca de 1 dia.',
      },
      {
        kind: 'h',
        text: 'Fase lútea',
      },
      {
        kind: 'p',
        text: 'Depois da ovulação até a próxima menstruação. Costuma durar de 12 a 14 dias e varia menos que a fase folicular. A progesterona sobe a temperatura do corpo em alguns décimos de grau. Inchaço, sensibilidade nas mamas e mudança de humor aparecem mais aqui.',
      },
      {
        kind: 'p',
        text: 'As datas das fases no app são estimativas. Elas ficam mais confiáveis quando você registra temperatura, muco ou testes de ovulação.',
      },
    ],
    sources: [
      'OMS, Planejamento Familiar — Um Manual Global para Profissionais (2022)',
      'NHS, Periods and fertility in the menstrual cycle',
    ],
  },
  {
    id: 'ciclo-irregular',
    topic: 'ciclo',
    title: 'Ciclo irregular: quando é normal',
    summary: 'Ciclos que variam pouco são comuns. Variação grande ou ciclos muito longos merecem conversa com profissional.',
    minutes: 3,
    blocks: [
      {
        kind: 'p',
        text: 'É comum o ciclo variar alguns dias. Estresse, viagem, doença, mudança de peso, treino intenso e amamentação mexem nas datas.',
      },
      {
        kind: 'h',
        text: 'Quando costuma ser normal',
      },
      {
        kind: 'list',
        items: [
          'A diferença entre o ciclo mais curto e o mais longo do ano é de até 7 a 9 dias.',
          'Nos primeiros anos depois da primeira menstruação e na perimenopausa, a irregularidade é esperada.',
          'Depois de parar a pílula, o ciclo pode levar alguns meses para se acertar.',
        ],
      },
      {
        kind: 'h',
        text: 'Quando vale procurar atendimento',
      },
      {
        kind: 'list',
        items: [
          'Ciclos com menos de 24 ou mais de 38 dias, com frequência.',
          'Três meses ou mais sem menstruar, sem gravidez.',
          'Sangramento entre as menstruações que se repete.',
          'Acne forte, pelos em excesso ou ganho de peso junto com ciclos longos. Pode ser síndrome dos ovários policísticos, que tem tratamento.',
        ],
      },
      {
        kind: 'p',
        text: 'O app mostra a variação dos seus ciclos em Análise. Leve esse número para a consulta.',
      },
    ],
    sources: ['FIGO (2018)', 'FEBRASGO, Protocolo de Sangramento Uterino Anormal'],
  },
  {
    id: 'quanto-sangramento',
    topic: 'menstruacao',
    title: 'Quanto sangramento é normal',
    summary: 'Pistas práticas para saber se o fluxo está forte demais.',
    minutes: 3,
    blocks: [
      {
        kind: 'p',
        text: 'A quantidade de sangue varia de pessoa para pessoa e de ciclo para ciclo. Os sinais abaixo ajudam a saber quando o fluxo passou do esperado.',
      },
      {
        kind: 'h',
        text: 'Sinais de fluxo intenso',
      },
      {
        kind: 'list',
        items: [
          'Trocar absorvente ou tampão a cada 1 ou 2 horas, por várias horas seguidas.',
          'Precisar usar dois produtos juntos ou levantar de madrugada para trocar.',
          'Coágulos maiores que uma moeda de 1 real.',
          'Menstruação que passa de 8 dias.',
          'Cansaço, falta de ar ou tontura, que podem indicar anemia.',
        ],
      },
      {
        kind: 'p',
        text: 'Fluxo intenso tem causas tratáveis, como miomas, pólipos, alterações de coagulação e efeito do DIU de cobre. Vale procurar atendimento em vez de só aguentar.',
      },
      {
        kind: 'h',
        text: 'Procure atendimento logo se',
      },
      {
        kind: 'list',
        items: [
          'O sangramento encharcar um absorvente por hora durante mais de 2 horas.',
          'Houver desmaio ou tontura forte.',
          'Você estiver grávida ou puder estar.',
        ],
      },
    ],
    sources: ['FEBRASGO, Protocolo de Sangramento Uterino Anormal', 'NHS, Heavy periods'],
  },
  {
    id: 'colica',
    topic: 'menstruacao',
    title: 'Cólica menstrual: o que ajuda',
    summary: 'Calor, movimento e anti-inflamatório funcionam para muita gente. Dor que não passa precisa de investigação.',
    minutes: 4,
    blocks: [
      {
        kind: 'p',
        text: 'A cólica vem das contrações do útero, puxadas por substâncias chamadas prostaglandinas. Costuma começar perto do primeiro dia de sangramento e durar de 1 a 3 dias.',
      },
      {
        kind: 'h',
        text: 'O que costuma aliviar',
      },
      {
        kind: 'list',
        items: [
          'Calor na barriga ou na lombar: bolsa térmica ou banho morno.',
          'Movimento leve, como caminhada ou alongamento.',
          'Anti-inflamatórios como ibuprofeno, tomados no começo da dor. Confira com profissional de saúde se você tem gastrite, problema nos rins, asma ou outra condição.',
          'Métodos hormonais, como pílula e DIU hormonal, reduzem a cólica em muita gente. A escolha é feita em consulta.',
        ],
      },
      {
        kind: 'h',
        text: 'Quando a dor é sinal de outra coisa',
      },
      {
        kind: 'p',
        text: 'Cólica que faz faltar ao trabalho ou à escola, que piora ano a ano ou que aparece fora da menstruação e na relação sexual pode ser endometriose ou adenomiose. Essas condições levam anos para ser diagnosticadas porque muita gente ouve que essa dor é normal. Dor desse tamanho merece investigação.',
      },
      {
        kind: 'p',
        text: 'No app, registre a dor e a intensidade. Em Análise, você vê em quantos ciclos a cólica apareceu.',
      },
    ],
    sources: ['ACOG, Dysmenorrhea: Painful Periods', 'FEBRASGO, Endometriose (protocolo)'],
  },
  {
    id: 'escape',
    topic: 'menstruacao',
    title: 'Escape: sangramento fora da menstruação',
    summary: 'Um pouco de sangue entre as menstruações é comum em algumas situações. Em outras, merece consulta.',
    minutes: 3,
    blocks: [
      {
        kind: 'p',
        text: 'Escape é um sangramento leve, que mal mancha o absorvente diário, fora dos dias de menstruação. No app ele é registrado à parte e não conta como dia 1 do ciclo.',
      },
      {
        kind: 'h',
        text: 'Situações em que costuma acontecer',
      },
      {
        kind: 'list',
        items: [
          'Nos primeiros meses de pílula, adesivo, anel, implante ou DIU hormonal.',
          'Perto da ovulação, em algumas pessoas.',
          'Logo antes da menstruação começar de vez.',
          'No início da gravidez, quando o embrião se implanta.',
        ],
      },
      {
        kind: 'h',
        text: 'Quando procurar atendimento',
      },
      {
        kind: 'list',
        items: [
          'Escape que se repete por vários ciclos sem explicação.',
          'Sangramento depois da relação sexual.',
          'Qualquer sangramento depois da menopausa.',
          'Sangramento com dor forte, febre ou durante a gravidez.',
        ],
      },
    ],
    sources: ['NHS, Bleeding between periods', 'FEBRASGO, Protocolo de Sangramento Uterino Anormal'],
  },
  {
    id: 'tpm',
    topic: 'sintomas',
    title: 'TPM e TDPM',
    summary: 'Sintomas antes da menstruação são comuns. Quando eles tomam conta da vida, pode ser TDPM, que tem tratamento.',
    minutes: 4,
    blocks: [
      {
        kind: 'p',
        text: 'A tensão pré-menstrual (TPM) aparece nos dias antes da menstruação e some quando ela começa. Os sintomas mais relatados são inchaço, sensibilidade nas mamas, irritação, choro fácil, fome maior e cansaço.',
      },
      {
        kind: 'h',
        text: 'O que ajuda',
      },
      {
        kind: 'list',
        items: [
          'Dormir bem e manter atividade física regular.',
          'Reduzir álcool e excesso de sal e cafeína nos dias mais difíceis.',
          'Registrar os sintomas por alguns ciclos. Ver o padrão ajuda a planejar a semana e a conversar com profissional.',
        ],
      },
      {
        kind: 'h',
        text: 'Transtorno disfórico pré-menstrual (TDPM)',
      },
      {
        kind: 'p',
        text: 'É uma forma grave, com tristeza profunda, ansiedade forte, raiva ou pensamentos negativos que atrapalham o trabalho e as relações. É uma condição reconhecida pela psiquiatria e tem tratamento com medicamentos e terapia.',
      },
      {
        kind: 'p',
        text: 'Se você tiver pensamentos de se machucar, procure ajuda agora: o CVV atende pelo 188, todos os dias, de graça.',
      },
    ],
    sources: ['ACOG, Premenstrual Syndrome (PMS)', 'Associação Americana de Psiquiatria, DSM-5-TR (critérios de TDPM)'],
  },
  {
    id: 'corrimento',
    topic: 'sintomas',
    title: 'Corrimento ao longo do ciclo',
    summary: 'O corrimento muda com os hormônios. Cheiro forte, coceira ou cor diferente pedem atenção.',
    minutes: 3,
    blocks: [
      {
        kind: 'p',
        text: 'Ter corrimento é normal. Ele muda de quantidade e de textura conforme os hormônios do ciclo.',
      },
      {
        kind: 'h',
        text: 'O padrão mais comum',
      },
      {
        kind: 'list',
        items: [
          'Logo depois da menstruação: pouco ou nenhum.',
          'Antes da ovulação: mais úmido e cremoso.',
          'Perto da ovulação: transparente e elástico, como clara de ovo. É o sinal de fertilidade que o app usa para estimar a ovulação.',
          'Depois da ovulação: mais grosso e escasso.',
        ],
      },
      {
        kind: 'h',
        text: 'Quando procurar atendimento',
      },
      {
        kind: 'list',
        items: [
          'Cheiro forte, principalmente depois da relação.',
          'Coceira, ardor ou vermelhidão.',
          'Cor amarelada, esverdeada ou acinzentada, ou aspecto de leite talhado.',
          'Dor ao urinar ou na relação.',
        ],
      },
      {
        kind: 'p',
        text: 'Infecções como candidíase, vaginose e algumas ISTs têm tratamento simples quando diagnosticadas.',
      },
    ],
    sources: [
      'Ministério da Saúde, Protocolo Clínico de Atenção Integral às Pessoas com IST',
      'OMS, manual de planejamento familiar (métodos baseados na percepção da fertilidade)',
    ],
  },
  {
    id: 'sono-humor-energia',
    topic: 'sintomas',
    title: 'Sono, humor e energia no ciclo',
    summary: 'Muita gente sente o ciclo no sono e no humor. Registrar mostra se é o seu caso.',
    minutes: 3,
    blocks: [
      {
        kind: 'p',
        text: 'Os hormônios do ciclo mexem com a temperatura do corpo, o sono e o humor. Isso não acontece com todo mundo, nem do mesmo jeito.',
      },
      {
        kind: 'h',
        text: 'O que é comum relatar',
      },
      {
        kind: 'list',
        items: [
          'Mais energia e disposição na fase folicular.',
          'Sono pior e mais calor à noite na fase lútea, quando a temperatura do corpo sobe um pouco.',
          'Humor mais sensível nos dias antes da menstruação.',
        ],
      },
      {
        kind: 'h',
        text: 'Como usar o app para entender o seu padrão',
      },
      {
        kind: 'p',
        text: 'Registre sono, energia e sentimentos por dois ou três ciclos. Em Análise, os sintomas frequentes mostram em que fase cada um mais aparece. Com isso, dá para planejar treinos, provas e conversas difíceis para os dias em que você costuma estar melhor.',
      },
      {
        kind: 'p',
        text: 'Se o humor muda a ponto de atrapalhar a vida, leia o artigo sobre TPM e TDPM.',
      },
    ],
    sources: ['NHS, PMS (premenstrual syndrome)', 'revisão sobre ciclo menstrual e sono publicada pela Sleep Medicine Reviews (2016)'],
  },
  {
    id: 'dor-de-cabeca',
    topic: 'sintomas',
    title: 'Dor de cabeça e enxaqueca menstrual',
    summary: 'A queda do estrogênio antes da menstruação dispara crises em algumas pessoas.',
    minutes: 3,
    blocks: [
      {
        kind: 'p',
        text: 'A enxaqueca menstrual aparece entre 2 dias antes e 3 dias depois do início da menstruação. Ela costuma ser mais forte e durar mais que as crises de outros dias.',
      },
      {
        kind: 'h',
        text: 'O que ajuda',
      },
      {
        kind: 'list',
        items: [
          'Anotar as crises no app, junto com a menstruação, por alguns ciclos. Esse registro é o que confirma o padrão.',
          'Com o padrão confirmado, há tratamentos preventivos para os dias certos. A escolha é feita com profissional.',
        ],
      },
      {
        kind: 'h',
        text: 'Atenção com pílula combinada',
      },
      {
        kind: 'p',
        text: 'Quem tem enxaqueca com aura (pontos de luz, visão em zigue-zague ou formigamento antes da dor) não deve usar métodos com estrogênio, pelo risco de AVC. Conte sobre a aura em qualquer consulta de contracepção.',
      },
      {
        kind: 'h',
        text: 'Procure atendimento urgente se',
      },
      {
        kind: 'list',
        items: [
          'For a pior dor de cabeça da sua vida, de início súbito.',
          'Vier com fraqueza, fala enrolada, confusão ou febre com rigidez na nuca.',
        ],
      },
    ],
    sources: ['OMS, Critérios Médicos de Elegibilidade para Uso de Anticoncepcionais (2015)', 'Sociedade Brasileira de Cefaleia'],
  },
  {
    id: 'janela-fertil',
    topic: 'fertilidade',
    title: 'Janela fértil e ovulação: o que a previsão pode e não pode dizer',
    summary: 'A previsão ajuda a se conhecer, mas não serve como método para evitar gravidez.',
    minutes: 4,
    blocks: [
      {
        kind: 'p',
        text: 'A janela fértil são os dias em que uma relação pode levar a uma gravidez: os 5 dias antes da ovulação e o dia dela.',
      },
      {
        kind: 'h',
        text: 'Como o app estima',
      },
      {
        kind: 'list',
        items: [
          'Sem sinais registrados, usa o calendário: a data provável da próxima menstruação menos a duração da fase lútea.',
          'Com temperatura basal, muco ou teste de ovulação, a estimativa usa esses sinais, nessa ordem de prioridade.',
          'A margem de erro aparece junto com a data. Ciclos irregulares deixam a margem maior.',
        ],
      },
      {
        kind: 'h',
        text: 'O que a previsão não faz',
      },
      {
        kind: 'p',
        text: 'O app não é método contraceptivo. A ovulação pode adiantar ou atrasar em qualquer ciclo, sem aviso. Métodos baseados em percepção da fertilidade exigem treino e regras próprias, e mesmo assim falham mais que os métodos de longa duração.',
      },
      {
        kind: 'p',
        text: 'Para engravidar, relações a cada 2 ou 3 dias ao longo do ciclo cobrem a janela sem depender da data exata.',
      },
    ],
    sources: ['OMS, Planejamento Familiar — Um Manual Global (2022)', 'NICE, Fertility problems: assessment and treatment'],
  },
  {
    id: 'temperatura-basal',
    topic: 'fertilidade',
    title: 'Temperatura basal: como medir',
    summary: 'A temperatura sobe depois da ovulação. Ela confirma que a ovulação passou, mas não avisa antes.',
    minutes: 4,
    blocks: [
      {
        kind: 'p',
        text: 'A temperatura basal é a do corpo em repouso. Depois da ovulação, a progesterona a sobe de 0,2 a 0,5 °C e ela fica alta até a próxima menstruação.',
      },
      {
        kind: 'h',
        text: 'Como medir',
      },
      {
        kind: 'list',
        items: [
          'Ao acordar, antes de levantar, falar ou beber água.',
          'Sempre no mesmo horário, depois de pelo menos 3 horas de sono seguido.',
          'Com termômetro de duas casas decimais.',
          'Anote no app todos os dias. Álcool, doença, noite mal dormida e mudança de fuso atrapalham; registre isso também.',
        ],
      },
      {
        kind: 'h',
        text: 'Como o app lê',
      },
      {
        kind: 'p',
        text: 'O app procura três medidas seguidas acima das seis anteriores. Quando acha, marca a ovulação como confirmada no ciclo e desenha a linha de cobertura no gráfico de Análise.',
      },
      {
        kind: 'p',
        text: 'A temperatura confirma depois que a ovulação aconteceu. Para saber antes, ela precisa ser combinada com muco ou teste de ovulação.',
      },
    ],
    sources: ['OMS, manual de planejamento familiar (método da temperatura basal)', 'FEBRASGO, Métodos Comportamentais de Anticoncepção'],
  },
  {
    id: 'testes',
    topic: 'fertilidade',
    title: 'Testes de ovulação e de gravidez',
    summary: 'Quando fazer cada teste e como ler o resultado.',
    minutes: 3,
    blocks: [
      {
        kind: 'h',
        text: 'Teste de ovulação',
      },
      {
        kind: 'p',
        text: 'Detecta o pico do hormônio LH, que vem de 24 a 36 horas antes da ovulação.',
      },
      {
        kind: 'list',
        items: [
          'Comece alguns dias antes da janela fértil prevista no app.',
          'Faça uma vez por dia, de preferência no mesmo horário, sem beber muito líquido antes.',
          'Positivo quer dizer que a ovulação deve vir nos próximos 1 ou 2 dias.',
          'Registre positivos e negativos no app; o positivo ajusta a estimativa de ovulação.',
        ],
      },
      {
        kind: 'p',
        text: 'Em quem tem síndrome dos ovários policísticos, o LH pode ficar alto o tempo todo e dar falso positivo.',
      },
      {
        kind: 'h',
        text: 'Teste de gravidez',
      },
      {
        kind: 'p',
        text: 'Detecta o hormônio hCG na urina.',
      },
      {
        kind: 'list',
        items: [
          'Funciona melhor a partir do primeiro dia de atraso.',
          'Negativo com a menstruação ainda atrasada: repita em 3 a 5 dias.',
          'Positivo: procure atendimento para começar o pré-natal. Se vier com dor forte de um lado da barriga ou sangramento, procure atendimento urgente.',
        ],
      },
    ],
    sources: ['Ministério da Saúde, Caderno de Atenção ao Pré-natal de Baixo Risco', 'NHS, Doing a pregnancy test'],
  },
  {
    id: 'contracepcao',
    topic: 'fertilidade',
    title: 'Métodos contraceptivos: um panorama',
    summary: 'Por que o app não é contraceptivo e como os métodos se comparam.',
    minutes: 4,
    blocks: [
      {
        kind: 'p',
        text: 'O Ciclo Livre não é método contraceptivo. As previsões são estimativas e não servem para decidir quando é seguro transar sem proteção.',
      },
      {
        kind: 'h',
        text: 'Os métodos mais eficazes',
      },
      {
        kind: 'p',
        text: 'Implante, DIU de cobre e DIU hormonal falham em menos de 1 em cada 100 pessoas por ano e duram anos. O SUS oferece DIU de cobre e, em vários lugares, o implante.',
      },
      {
        kind: 'h',
        text: 'Métodos que dependem do uso certo',
      },
      {
        kind: 'p',
        text: 'Pílula, injeção, anel e adesivo funcionam muito bem quando usados sem falhas. Na vida real, esquecimentos e atrasos fazem a falha subir para algo entre 4 e 7 em cada 100 por ano.',
      },
      {
        kind: 'h',
        text: 'Camisinha',
      },
      {
        kind: 'p',
        text: 'É o único método que também protege contra ISTs. Pode ser combinada com qualquer outro.',
      },
      {
        kind: 'h',
        text: 'Contracepção de emergência',
      },
      {
        kind: 'p',
        text: 'A pílula de emergência funciona melhor quanto antes for tomada, até 5 dias depois da relação. Ela está disponível no SUS.',
      },
      {
        kind: 'p',
        text: 'No app, os lembretes de pílula, adesivo, anel e injeção ajudam a não esquecer.',
      },
    ],
    sources: [
      'OMS, Planejamento Familiar — Um Manual Global (2022)',
      'Ministério da Saúde, Caderno de Atenção Básica — Saúde Sexual e Reprodutiva',
    ],
  },
  {
    id: 'perimenopausa',
    topic: 'fases',
    title: 'Perimenopausa: o que muda',
    summary: 'Os anos antes da última menstruação trazem ciclos irregulares, ondas de calor e mudanças no sono.',
    minutes: 4,
    blocks: [
      {
        kind: 'p',
        text: 'A perimenopausa é a transição até a menopausa. Costuma começar depois dos 40 anos e durar alguns anos. A menopausa é confirmada depois de 12 meses seguidos sem menstruar.',
      },
      {
        kind: 'h',
        text: 'O que costuma mudar',
      },
      {
        kind: 'list',
        items: [
          'Ciclos mais curtos no começo e, depois, intervalos maiores.',
          'Fluxo mais forte ou mais fraco que antes.',
          'Ondas de calor e suor noturno.',
          'Sono pior, irritação, dificuldade de concentração.',
          'Ressecamento vaginal.',
        ],
      },
      {
        kind: 'h',
        text: 'Ainda é possível engravidar',
      },
      {
        kind: 'p',
        text: 'Enquanto houver menstruação, mesmo irregular, pode haver ovulação. Converse sobre contracepção até a menopausa ser confirmada.',
      },
      {
        kind: 'h',
        text: 'Há tratamento',
      },
      {
        kind: 'p',
        text: 'Terapia hormonal, outras medicações e mudanças de rotina aliviam os sintomas. A indicação depende da sua saúde e é feita em consulta.',
      },
      {
        kind: 'p',
        text: 'O modo Perimenopausa do app registra ondas de calor e ajuda a mostrar o padrão para quem te atende.',
      },
    ],
    sources: ['FEBRASGO, Manual de Climatério', 'NICE, Menopause: diagnosis and management'],
  },
  {
    id: 'sinais-de-alerta',
    topic: 'fases',
    title: 'Quando procurar atendimento',
    summary: 'Sinais que não devem esperar a próxima consulta.',
    minutes: 3,
    blocks: [
      {
        kind: 'p',
        text: 'Procure pronto-atendimento se tiver:',
      },
      {
        kind: 'list',
        items: [
          'Dor forte e súbita na barriga, principalmente com atraso menstrual ou teste de gravidez positivo.',
          'Sangramento que encharca um absorvente por hora por mais de 2 horas.',
          'Desmaio, tontura forte ou falta de ar.',
          'Febre com dor no pé da barriga ou corrimento com cheiro forte.',
          'Qualquer sangramento durante a gravidez.',
        ],
      },
      {
        kind: 'p',
        text: 'Marque consulta, sem urgência, se tiver:',
      },
      {
        kind: 'list',
        items: [
          'Três meses ou mais sem menstruar, sem gravidez.',
          'Cólica que piora a cada ano ou dor na relação sexual.',
          'Sangramento entre as menstruações que se repete.',
          'Qualquer sangramento depois da menopausa.',
        ],
      },
      {
        kind: 'p',
        text: 'O relatório para consulta, em Mais → Seus dados, reúne seus últimos ciclos num PDF para mostrar a quem te atende.',
      },
    ],
    sources: ['Ministério da Saúde, Caderno de Atenção Básica — Saúde das Mulheres', 'NHS, When to see a GP about periods'],
  },
];
