/* efeitos.js — biblioteca de efeitos de estúdio da skill site-premium.
   Requer (nesta ordem, antes deste arquivo):
     https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js
     https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/ScrollTrigger.min.js
     https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/SplitText.min.js
     https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.min.js
   Tudo é ligado por atributos data-* no HTML (lista em references/efeitos-e-componentes.md, seção "efeitos.js").
   Modo estático: ?estatico na URL ou prefers-reduced-motion → nada anima, tudo aparece no estado final
   (é o modo que os prints de página inteira usam). Estados iniciais são definidos aqui, nunca no CSS,
   para o site continuar legível se o JS falhar. */
(() => {
  const qs = (s, r = document) => [...r.querySelectorAll(s)];
  const estatico = /[?&]estatico\b/.test(location.search) || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const toque = matchMedia('(hover: none)').matches;
  document.documentElement.classList.add(estatico ? 'is-estatico' : 'is-animado');

  // Marquee e text roll também servem no estático (só montam o DOM).
  qs('[data-marquee]').forEach(m => {
    const trilho = m.firstElementChild;
    trilho.innerHTML += trilho.innerHTML;
    trilho.style.setProperty('--dur', (m.dataset.marquee || 40) + 's');
  });
  qs('[data-rolar]').forEach(a => {
    const t = a.textContent.trim();
    a.setAttribute('aria-label', t);
    a.innerHTML = `<span class="rolar" aria-hidden="true"><span>${t}</span><span>${t}</span></span>`;
  });
  // Nome gigante (rodapé/hero) que ocupa a largura exata do contêiner, sem cortar letra. <div data-encaixar>Nome</div>
  const encaixar = () => qs('[data-encaixar]').forEach(el => {
    el.style.fontSize = '100px';
    const larg = el.parentElement.clientWidth - parseFloat(getComputedStyle(el.parentElement).paddingLeft) - parseFloat(getComputedStyle(el.parentElement).paddingRight);
    el.style.fontSize = (100 * larg / el.scrollWidth * 0.995) + 'px';
  });
  encaixar(); document.fonts.ready.then(encaixar); addEventListener('resize', encaixar);
  if (estatico || !window.gsap) return;

  gsap.registerPlugin(ScrollTrigger, SplitText);
  const EASE = 'expo.out';

  // 1. Scroll suave (Lenis) sincronizado com o ScrollTrigger; âncoras passam pelo Lenis.
  let lenis = null;
  if (window.Lenis && !toque) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    qs('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const alvo = a.getAttribute('href').length > 1 && document.querySelector(a.getAttribute('href'));
      if (alvo) { e.preventDefault(); lenis.scrollTo(alvo, { offset: -20, duration: 1.4 }); }
    }));
  }
  window.siteLenis = lenis;

  // 2. Navbar some ao descer e volta ao subir; ganha fundo depois do hero.
  const nav = document.querySelector('[data-nav]');
  if (nav) {
    let ultimo = 0;
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => {
      const y = s.scroll();
      nav.classList.toggle('nav-escondida', y > 160 && y > ultimo);
      nav.classList.toggle('nav-solida', y > innerHeight * 0.6);
      ultimo = y;
    } });
  }

  document.fonts.ready.then(() => {
    // 3. Títulos por linha dentro de máscara. data-linhas no hero ([data-hero]) toca no carregamento.
    qs('[data-linhas]').forEach(el => {
      const noHero = el.closest('[data-hero]');
      SplitText.create(el, { type: 'lines', mask: 'lines', autoSplit: true, linesClass: 'linha', onSplit: self =>
        gsap.from(self.lines, { yPercent: 110, duration: 1.25, ease: EASE, stagger: 0.09,
          delay: noHero ? 0.25 + Number(el.dataset.atraso || 0) : 0,
          scrollTrigger: noHero ? null : { trigger: el, start: 'top 86%', once: true } }) });
    });
    // 4. Palavras que saem do desfoque (subtítulos, apoio).
    qs('[data-palavras]').forEach(el => {
      const noHero = el.closest('[data-hero]');
      SplitText.create(el, { type: 'words', onSplit: self =>
        gsap.from(self.words, { opacity: 0, filter: 'blur(8px)', y: 8, duration: 0.9, ease: 'power3.out', stagger: 0.035,
          delay: noHero ? 0.7 + Number(el.dataset.atraso || 0) : 0,
          scrollTrigger: noHero ? null : { trigger: el, start: 'top 88%', once: true } }) });
    });
    // 5. Manifesto: as palavras acendem conforme a rolagem.
    qs('[data-acender]').forEach(el => {
      SplitText.create(el, { type: 'words', onSplit: self =>
        gsap.fromTo(self.words, { opacity: 0.14 }, { opacity: 1, ease: 'none', stagger: 0.1,
          scrollTrigger: { trigger: el, start: 'top 75%', end: 'bottom 45%', scrub: true } }) });
    });
    ScrollTrigger.refresh();
  });

  // 6. Foto revelada por clip-path com zoom interno.
  qs('[data-revelar]').forEach(box => {
    const img = box.querySelector('img, video');
    const de = { cima: 'inset(0 0 100% 0)', baixo: 'inset(100% 0 0 0)', esquerda: 'inset(0 100% 0 0)', direita: 'inset(0 0 0 100%)' }[box.dataset.revelar || 'baixo'];
    const noHero = box.closest('[data-hero]');
    const tl = gsap.timeline({ scrollTrigger: noHero ? null : { trigger: box, start: 'top 85%', once: true }, delay: noHero ? 0.1 : 0 });
    tl.fromTo(box, { clipPath: de }, { clipPath: 'inset(0 0 0% 0)', duration: 1.5, ease: 'expo.inOut' });
    if (img) tl.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 1.9, ease: EASE }, 0);
  });

  // 7. Parallax dentro da moldura (a imagem precisa ser ~115% da altura da moldura: classe .parallax no CSS base).
  qs('[data-parallax]').forEach(box => {
    const img = box.querySelector('img, video');
    const n = Number(box.dataset.parallax || 8);
    gsap.fromTo(img, { yPercent: -n }, { yPercent: n, ease: 'none', scrollTrigger: { trigger: box, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // 8. Entrada simples para blocos (use pouco: títulos e fotos já têm os seus).
  qs('[data-surgir]').forEach(el => gsap.from(el, { opacity: 0, y: 24, duration: 1, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 90%', once: true } }));

  // 9. Contadores (só números reais). data-contar="1998" data-de="1950".
  qs('[data-contar]').forEach(el => {
    const fim = Number(el.dataset.contar), obj = { v: Number(el.dataset.de || 0) };
    gsap.to(obj, { v: fim, duration: 2.2, ease: 'power2.out', onUpdate: () => el.textContent = Math.round(obj.v),
      scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });

  // 10. Hero que encolhe em moldura ao rolar.
  qs('[data-encolher]').forEach(box => {
    gsap.to(box, { clipPath: 'inset(6% 5% 6% 5% round 4px)', ease: 'none',
      scrollTrigger: { trigger: box, start: 'top top', end: 'bottom top', scrub: true } });
    const img = box.querySelector('img, video');
    if (img) gsap.to(img, { scale: 1.12, ease: 'none', scrollTrigger: { trigger: box, start: 'top top', end: 'bottom top', scrub: true } });
  });

  // 11. Seção com foto fixa que troca conforme o passo ativo.
  //     <section data-troca> <div class="troca-fotos"><img data-passo="0">…</div> <ol><li data-passo="0">…</li>…</ol>
  qs('[data-troca]').forEach(sec => {
    const fotos = qs('.troca-fotos [data-passo]', sec);
    fotos[0]?.classList.add('ativa');
    qs('li[data-passo], article[data-passo]', sec).forEach(item => ScrollTrigger.create({
      trigger: item, start: 'top 60%', end: 'bottom 60%',
      onToggle: s => { if (!s.isActive) return;
        fotos.forEach(f => f.classList.toggle('ativa', f.dataset.passo === item.dataset.passo));
        qs('[data-passo]', sec).forEach(i => i.classList.toggle('ativo', i === item)); } }));
  });

  // 12. Linha do tempo que se desenha.
  qs('[data-linha-tempo]').forEach(el => gsap.fromTo(el, { scaleY: 0 }, { scaleY: 1, transformOrigin: 'top', ease: 'none',
    scrollTrigger: { trigger: el.parentElement, start: 'top 70%', end: 'bottom 70%', scrub: true } }));

  if (toque) return; // daqui pra baixo só faz sentido com mouse

  // 13. Lista com faixa que entra pelo lado do mouse (áreas de atuação). <li data-fluir> <a>…</a> <div class="fluir-faixa">…</div>
  qs('[data-fluir]').forEach(li => {
    const faixa = li.querySelector('.fluir-faixa'), dentro = faixa && faixa.firstElementChild;
    if (!faixa) return;
    const lado = e => { const r = li.getBoundingClientRect(); return e.clientY - r.top < r.height / 2 ? -101 : 101; };
    li.addEventListener('mouseenter', e => { const d = lado(e);
      gsap.timeline({ defaults: { duration: 0.6, ease: 'expo.out' } })
        .fromTo(faixa, { yPercent: d }, { yPercent: 0 }, 0).fromTo(dentro, { yPercent: -d }, { yPercent: 0 }, 0); });
    li.addEventListener('mouseleave', e => { const d = lado(e);
      gsap.timeline({ defaults: { duration: 0.6, ease: 'expo.out' } })
        .to(faixa, { yPercent: d }, 0).to(dentro, { yPercent: -d }, 0); });
  });

  // 15. Botão magnético (só no CTA principal).
  qs('[data-magnetico]').forEach(b => {
    const x = gsap.quickTo(b, 'x', { duration: 0.5, ease: 'elastic.out(1,0.5)' }), y = gsap.quickTo(b, 'y', { duration: 0.5, ease: 'elastic.out(1,0.5)' });
    b.addEventListener('mousemove', e => { const r = b.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * 0.3); y((e.clientY - r.top - r.height / 2) * 0.4); });
    b.addEventListener('mouseleave', () => { x(0); y(0); });
  });

  // 16. Luz que segue o mouse dentro de um bloco (define --mx/--my; o CSS desenha o gradiente).
  qs('[data-luz]').forEach(el => el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`); el.style.setProperty('--my', `${e.clientY - r.top}px`);
  }));
})();
