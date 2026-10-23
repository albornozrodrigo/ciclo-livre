// Hero: o lobo atravessa as fases do ciclo, como a tela Hoje do app. Copiar a chave Pix.
(() => {
  const phases = [
    { name: 'Menstruação', day: 2, a: '--coral', b: '--pond' },
    { name: 'Fase folicular', day: 7, a: '--pond', b: '--land' },
    { name: 'Janela fértil', day: 12, a: '--land', b: '--lilac' },
    { name: 'Fase lútea', day: 21, a: '--lilac', b: '--coral' },
  ];
  const hero = document.querySelector('.hero');
  const tag = document.getElementById('hero-phase');
  const day = document.getElementById('hero-day');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');

  let i = 2;
  const show = () => {
    const p = phases[i];
    hero.style.setProperty('--phase', `var(${p.a})`);
    hero.style.setProperty('--next', `var(${p.b})`);
    tag.textContent = p.name;
    day.textContent = `Dia ${p.day} do ciclo`;
  };

  let timer = null;
  const start = () => {
    if (timer || still.matches) return;
    timer = setInterval(() => {
      i = (i + 1) % phases.length;
      show();
    }, 3200);
  };
  const stop = () => {
    clearInterval(timer);
    timer = null;
  };
  // Só anima com o topo à vista.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(hero);
  }
  still.addEventListener?.('change', () => (still.matches ? stop() : start()));

  const btn = document.getElementById('copy-pix');
  const out = document.getElementById('copied');
  const key = document.getElementById('pix-key').textContent.trim();
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(key);
      out.textContent = 'copiada, obrigado!';
    } catch {
      out.textContent = 'Não deu para copiar. Selecione a chave e copie.';
    }
  });
})();
