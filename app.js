// Milena Claudino — prévia conceitual (Bruno Luque).
// Ideia: "o perfil como desenho". Um único traço contínuo desenha um perfil; pontos de equilíbrio se acendem.
// Camadas de motion:
//   Assinatura  — hero (traço que se desenha + ponto de luz que segue o ponteiro) e cena presa "Leitura do perfil".
//   Narrativa   — saída do hero; cortina clara das especialidades; retrato oval revelado por máscara; traço do contato.
//   Interface   — botões (pressão), acordeão em fluxo contínuo, CTA magnético, menu e CTA fixo do celular.
// O conteúdo funciona sem este arquivo: os estados escondidos só existem depois de `motion-ready`.

const root = document.documentElement;
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const fineMQ = matchMedia('(hover: hover) and (pointer: fine)');
const wideMQ = matchMedia('(min-width: 961px) and (min-height: 600px)');
const reduce = reduceMQ.matches;
if (reduce) root.classList.add('reduce');

/* tokens de motion (espelham o CSS) */
const EASE_OUT = [0.23, 1, 0.32, 1];
const EASE_IN_OUT = [0.77, 0, 0.175, 1];
const EASE_OUT_CSS = 'cubic-bezier(0.23, 1, 0.32, 1)';
const EASE_IN_OUT_CSS = 'cubic-bezier(0.77, 0, 0.175, 1)';
const DUR = { press: 0.13, control: 0.22, panel: 0.38, draw: 1.6 };
const SPRING = { magnetic: { stiffness: 220, damping: 18 }, dot: { stiffness: 90, damping: 16 } };

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const M = window.Motion || null;
if (!M) console.warn('Motion indisponível; página segue estática.');

/* ------------------------------------------------------------------ */
/* Amostragem do traço (para o ponto de luz e para encaixar os pontos)  */
/* ------------------------------------------------------------------ */
function sampleGhost(ghost, n = 260) {
  const total = ghost.getTotalLength();
  const pts = [];
  for (let i = 0; i <= n; i++) { const l = (i / n) * total; const p = ghost.getPointAtLength(l); pts.push({ x: p.x, y: p.y, f: i / n }); }
  return { total, pts };
}
function nearest(pts, x, y) {
  let best = pts[0], d = Infinity;
  for (const p of pts) { const dd = (p.x - x) ** 2 + (p.y - y) ** 2; if (dd < d) { d = dd; best = p; } }
  return { p: best, d: Math.sqrt(d) };
}

/* mola escalar/vetorial com velocidade preservada (interrompível) */
function spring(apply, { stiffness = 170, damping = 20 } = {}, dims = 2) {
  const s = { v: new Array(dims).fill(0), x: new Array(dims).fill(0), t: new Array(dims).fill(0), raf: 0, last: 0 };
  const tick = (now) => {
    const dt = Math.min(0.032, (now - (s.last || now)) / 1000 || 0.016); s.last = now;
    let rest = 0;
    for (let k = 0; k < dims; k++) {
      const f = -stiffness * (s.x[k] - s.t[k]) - damping * s.v[k];
      s.v[k] += f * dt; s.x[k] += s.v[k] * dt; rest += Math.abs(s.x[k] - s.t[k]) + Math.abs(s.v[k]);
    }
    apply(...s.x);
    if (rest > 0.0005) s.raf = requestAnimationFrame(tick); else { s.raf = 0; s.last = 0; }
  };
  const set = (...t) => { s.t = t; if (!s.raf) s.raf = requestAnimationFrame(tick); };
  set.jump = (...t) => { s.t = t.slice(); s.x = t.slice(); s.v.fill(0); apply(...t); };
  set.stop = () => { cancelAnimationFrame(s.raf); s.raf = 0; s.last = 0; };
  return set;
}

/* ------------------------------------------------------------------ */
/* Topo e CTA fixo do polegar                                           */
/* ------------------------------------------------------------------ */
const top = $('[data-top]');
const onScrollTop = () => top.classList.toggle('is-solid', scrollY > 24);
addEventListener('scroll', onScrollTop, { passive: true }); onScrollTop();

const dock = $('[data-dock]');
if (dock && 'IntersectionObserver' in window) {
  const vis = { hero: true, end: false };
  // escondido = fora da ordem de foco e da árvore de acessibilidade
  const upd = () => { const on = !vis.hero && !vis.end; dock.classList.toggle('is-on', on); dock.inert = !on; dock.toggleAttribute('aria-hidden', !on); };
  upd();
  new IntersectionObserver(([e]) => { vis.hero = e.isIntersecting; upd(); }, { threshold: 0, rootMargin: '0px 0px -35% 0px' }).observe($('.hero__actions'));
  const endIO = new IntersectionObserver((es) => { es.forEach((e) => { e.target._in = e.isIntersecting; }); vis.end = [$('#contato'), $('.foot')].some((n) => n._in); upd(); }, { threshold: 0.05 });
  endIO.observe($('#contato')); endIO.observe($('.foot'));
}

/* ------------------------------------------------------------------ */
/* Rolagem contínua (Lenis) — só roda do mouse/trackpad; toque nativo   */
/* ------------------------------------------------------------------ */
let lenis = null;
function startLenis() {
  if (reduce || !window.Lenis || lenis || !fineMQ.matches) return;
  lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.95 });
  const raf = (t) => { if (!lenis) return; lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
startLenis();
reduceMQ.addEventListener('change', () => { if (reduceMQ.matches && lenis) { lenis.destroy(); lenis = null; } });

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  const target = id === '#inicio' ? document.body : $(id);
  if (!target) return;
  e.preventDefault();
  const offset = id === '#inicio' || id === '#leitura' ? 0 : -(top.offsetHeight + 8);
  const y = id === '#inicio' ? 0 : target.getBoundingClientRect().top + scrollY + offset;
  if (lenis) lenis.scrollTo(y, { duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  if (id !== '#inicio') { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
});

/* ------------------------------------------------------------------ */
/* Leitura do perfil: encaixa pontos e guias no traço                   */
/* ------------------------------------------------------------------ */
const reading = $('[data-reading]');
const rSvg = $('[data-reading-svg]');
const rPath = $('[data-reading-path]');
const rGhost = rSvg && $('.profile-ghost', rSvg);
const pts = $$('[data-pt]');
const axis = $('[data-axis]');
const OFF = { x: 110, y: 10 };      // translate do grupo do perfil
const GUIDE_END = 930, AXIS_X = 410;
const APPROX = [[285, 134], [334, 298], [311, 354], [302, 432]]; // testa, nariz, lábios, queixo (coords do perfil)
let frac = [0.36, 0.5, 0.58, 0.68];
if (rGhost) {
  const { pts: S } = sampleGhost(rGhost, 600);
  frac = APPROX.map(([x, y], k) => {
    const { p } = nearest(S, x, y);
    const g = pts[k];
    const cx = p.x + OFF.x, cy = p.y + OFF.y;
    $$('circle', g).forEach((c) => { c.setAttribute('cx', cx.toFixed(1)); c.setAttribute('cy', cy.toFixed(1)); });
    const ln = $('.guide', g); ln.setAttribute('x1', (cx + 8).toFixed(1)); ln.setAttribute('y1', cy.toFixed(1)); ln.setAttribute('y2', cy.toFixed(1));
    $('.pt__label', g).setAttribute('y', (cy - 12).toFixed(1));
    g._cx = cx; g._cy = cy;
    return p.f;
  });
}
const steps = $$('[data-step]');
const endBlock = $('[data-reading-end]');
const rail = $('[data-rail]');
const setDash = (el, v) => { el.style.strokeDasharray = '1'; el.style.strokeDashoffset = String(1 - v); };

/* ------------------------------------------------------------------ */
/* Acordeão das especialidades (funciona sem Motion)                    */
/* ------------------------------------------------------------------ */
const items = $$('[data-acc-item]');
const frame = $('[data-stage-frame]');
const stageN = $('[data-stage-n]');
let openIdx = 0;
function stageNode(li) {
  if (li.dataset.plate) {
    const d = document.createElement('div');
    d.className = 'spec__plate';
    d.innerHTML = '<b>Harmonização glútea</b><span>Especialidade de Milena, conversada individualmente na avaliação.</span>';
    return d;
  }
  const im = new Image();
  if (li.dataset.srcset) { im.srcset = li.dataset.srcset; im.sizes = '(max-width: 860px) 92vw, 34vw'; }
  im.src = li.dataset.img; im.alt = li.dataset.alt || ''; im.width = +li.dataset.w; im.height = +li.dataset.h;
  im.style.objectPosition = li.dataset.pos || '50% 30%';
  im.decoding = 'async';
  return im;
}
function openItem(i, { focusBtn = false } = {}) {
  if (i === openIdx) { // fechar o aberto também é permitido
    const li = items[i]; const was = li.classList.toggle('is-open');
    $('.acc__btn', li).setAttribute('aria-expanded', String(was));
    return;
  }
  const dir = i > openIdx ? 1 : -1;
  items.forEach((li, k) => { const on = k === i; li.classList.toggle('is-open', on); $('.acc__btn', li).setAttribute('aria-expanded', String(on)); });
  openIdx = i;
  if (stageN) stageN.textContent = String(i + 1).padStart(2, '0');
  if (focusBtn) $('.acc__btn', items[i]).focus();
  if (!frame) return;
  const next = stageNode(items[i]);
  frame.appendChild(next);
  const olds = [...frame.children].slice(0, -1);
  if (M && !reduce) {
    const from = dir > 0 ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)';
    M.animate(next, { clipPath: [from, 'inset(0% 0% 0% 0%)'], transform: ['scale(1.08)', 'scale(1)'] }, { duration: 0.8, ease: EASE_IN_OUT })
      .then(() => olds.forEach((o) => o.remove()));
    olds.forEach((o) => M.animate(o, { transform: 'scale(.97)', opacity: 0.5 }, { duration: 0.8, ease: EASE_IN_OUT }));
  } else olds.forEach((o) => o.remove());
}
items.forEach((li, i) => {
  const btn = $('.acc__btn', li);
  btn.addEventListener('click', () => openItem(i));
  btn.addEventListener('keydown', (e) => {
    const k = e.key;
    const to = k === 'ArrowDown' ? (i + 1) % items.length : k === 'ArrowUp' ? (i - 1 + items.length) % items.length : k === 'Home' ? 0 : k === 'End' ? items.length - 1 : -1;
    if (to < 0) return;
    e.preventDefault(); $('.acc__btn', items[to]).focus();
  });
});
(window.requestIdleCallback || ((f) => setTimeout(f, 1500)))(() => items.forEach((li) => { if (li.dataset.img) { const im = new Image(); if (li.dataset.srcset) { im.srcset = li.dataset.srcset; im.sizes = '(max-width: 860px) 92vw, 34vw'; } im.src = li.dataset.img; } }));

/* ------------------------------------------------------------------ */
/* CTA magnético (só ponteiro fino; usa `translate`, livre do :active)  */
/* ------------------------------------------------------------------ */
if (!reduce && fineMQ.matches) {
  $$('[data-magnetic]').forEach((b) => {
    const set = spring((x, y) => { b.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`; }, SPRING.magnetic);
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      set((e.clientX - r.left - r.width / 2) * 0.16, (e.clientY - r.top - r.height / 2) * 0.28);
    });
    b.addEventListener('pointerleave', () => set(0, 0));
  });
}

/* ------------------------------------------------------------------ */
/* Coreografia                                                          */
/* ------------------------------------------------------------------ */
const prog = (p) => (typeof p === 'number' ? p : p?.y?.progress ?? 0);

if (reduce || !M) {
  // estático e completo: perfil desenhado, quatro pontos acesos, etapas em lista
  root.classList.add('motion-ready');
} else {
  const { animate, scroll, inView, stagger } = M;
  const scrub = wideMQ.matches;
  root.classList.add(scrub ? 'scrub' : 'stepmode');

  /* ---- HERO ---- */
  const heroPath = $('[data-hero-path]');
  const heroLine = $('[data-hero-line]');
  const heroGhost = heroLine && $('.profile-ghost', heroLine);
  const dot = $('[data-hero-dot]'), dotCore = $('[data-hero-dot-core]');
  const mini = $('.hero__mini .profile-line');
  [heroPath, mini].forEach((p) => p && setDash(p, 0));
  if (dot) { dot.style.opacity = 0; dotCore.style.opacity = 0; }
  root.classList.add('motion-ready');

  // texto: máscara por linha, curta (nome, especialidade e CTA já estão legíveis)
  animate('.hero__title .line > span', { transform: ['translateY(104%)', 'translateY(0%)'] }, { duration: 0.9, delay: stagger(0.07), ease: EASE_OUT });
  animate('.hero__lead, .hero__actions, .hero__note', { opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0)'] }, { duration: 0.6, delay: stagger(0.06, { startDelay: 0.12 }), ease: EASE_OUT });
  animate('.hero__photo', { clipPath: ['inset(0% 0% 100% 0% round 999px 999px 4px 4px)', 'inset(0% 0% 0% 0% round 999px 999px 4px 4px)'] }, { duration: 1.2, delay: 0.1, ease: EASE_IN_OUT });
  animate('.hero__photo img', { transform: ['scale(1.14)', 'scale(1)'] }, { duration: 1.8, delay: 0.1, ease: EASE_OUT });

  // o traço se desenha (~1,6 s); em SVG uso WAAPI direto
  const drawAnim = [heroPath, mini].filter(Boolean).map((p) => p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: DUR.draw * 1000, delay: 250, easing: EASE_IN_OUT_CSS, fill: 'forwards' }));

  // ponto de luz: percorre a linha uma vez e depois procura o ponteiro
  if (heroGhost && dot) {
    const { total, pts: S } = sampleGhost(heroGhost, 280);
    const placeDot = (f) => {
      const p = heroGhost.getPointAtLength(clamp(f) * total);
      dot.setAttribute('cx', p.x.toFixed(1)); dot.setAttribute('cy', p.y.toFixed(1));
      dotCore.setAttribute('cx', p.x.toFixed(1)); dotCore.setAttribute('cy', p.y.toFixed(1));
    };
    const runner = spring((f) => placeDot(f), SPRING.dot, 1);
    const noseF = nearest(S, 331, 296).p.f;
    drawAnim[0]?.finished.then(() => {
      runner.jump(0);
      dot.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, fill: 'forwards' });
      dotCore.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, fill: 'forwards' });
      dotCore.style.opacity = 1; dot.style.opacity = 1;
      runner(noseF);
      dot.animate([{ r: 14 }, { r: 20 }, { r: 14 }], { duration: 2600, iterations: 2, easing: 'ease-in-out' });
    }).catch(() => {});

    let heroIn = true, pending = null, rafId = 0;
    new IntersectionObserver(([e]) => { heroIn = e.isIntersecting; if (!heroIn) runner.stop(); }).observe($('[data-hero]'));
    if (fineMQ.matches) {
      const follow = () => {
        rafId = 0;
        if (!pending || !heroIn) return;
        const m = heroGhost.getScreenCTM(); if (!m) return;
        const pt = new DOMPoint(pending.x, pending.y).matrixTransform(m.inverse());
        runner(nearest(S, pt.x, pt.y).p.f);
      };
      addEventListener('pointermove', (e) => { if (!heroIn) return; pending = { x: e.clientX, y: e.clientY }; if (!rafId) rafId = requestAnimationFrame(follow); }, { passive: true });
    }
  }

  // saída do hero: o retrato sobe devagar, o traço clareia e recua (narrativa 1)
  const heroArt = $('[data-hero-art]');
  const heroImg = $('.hero__photo img');
  scroll((p) => {
    const t = prog(p);
    heroImg.style.translate = `0 ${(t * 7).toFixed(2)}%`;
    if (heroLine) { heroLine.style.opacity = (1 - t * 0.85).toFixed(3); heroLine.style.translate = `${(t * 30).toFixed(1)}px 0`; }
    heroArt.style.translate = `0 ${(t * -40).toFixed(1)}px`;
  }, { target: $('[data-hero]'), offset: ['start start', 'end start'] });

  /* ---- CENA: leitura do perfil ---- */
  if (rPath) {
    if (scrub) {
      const KEYS = [0, 0.1, 0.28, 0.46, 0.64, 0.8];   // progresso
      const DRAW = [0, frac[0], frac[1], frac[2], frac[3], 1];
      const LIGHT = [0.1, 0.28, 0.46, 0.64];
      const drawAt = (p) => { for (let i = 1; i < KEYS.length; i++) if (p <= KEYS[i]) return lerp(DRAW[i - 1], DRAW[i], clamp((p - KEYS[i - 1]) / (KEYS[i] - KEYS[i - 1]))); return 1; };
      steps.forEach((s, i) => { s.style.opacity = i ? 0 : 1; s.style.visibility = i ? 'hidden' : 'visible'; });
      steps[0].classList.add('is-active');
      endBlock.style.opacity = 0; endBlock.style.visibility = 'hidden';
      let current = 0;
      const blocks = [...steps, endBlock];
      const show = (i) => {
        if (i === current) return;
        const prev = blocks[current], next = blocks[i], dir = i > current ? 1 : -1;
        current = i;
        animate(prev, { opacity: 0, transform: `translateY(${-14 * dir}px)` }, { duration: 0.24, ease: EASE_OUT })
          .then(() => { if (blocks[current] !== prev) prev.style.visibility = 'hidden'; });
        next.style.visibility = 'visible';
        animate(next, { opacity: [0, 1], transform: [`translateY(${20 * dir}px)`, 'translateY(0px)'] }, { duration: 0.5, delay: 0.06, ease: EASE_OUT });
        steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
      };
      const guides = pts.map((g) => ({ g, line: $('.guide', g), label: $('.pt__label', g), halo: $('.pt__halo', g), dot: $('.pt__dot', g) }));
      const render = (p) => {
        setDash(rPath, drawAt(p));
        const F = clamp((p - 0.82) / 0.12);
        guides.forEach(({ g, line, label, halo, dot: d }, k) => {
          const L = clamp((p - LIGHT[k]) / 0.06);
          const x2 = lerp(g._cx + 8, GUIDE_END, L);
          line.setAttribute('x2', lerp(x2, AXIS_X, F).toFixed(1));
          line.setAttribute('x1', lerp(g._cx + 8, AXIS_X, F).toFixed(1));
          line.style.opacity = (L * (1 - F * 0.6)).toFixed(3);
          label.style.opacity = (clamp((p - LIGHT[k] - 0.03) / 0.05) * (1 - F)).toFixed(3);
          d.style.opacity = L.toFixed(3);
          d.style.transform = `scale(${(0.4 + 0.6 * L).toFixed(3)})`;
          const active = p >= LIGHT[k] && (k === 3 ? p < 0.82 : p < LIGHT[k + 1]);
          halo.style.opacity = (L * (active ? 1 : 0.35)).toFixed(3);
        });
        setDash(axis, F);
        rail.style.transform = `scaleY(${p.toFixed(4)})`;
        const idx = p >= 0.86 ? 4 : Math.max(0, LIGHT.filter((x) => p >= x).length - 1);
        show(idx);
      };
      guides.forEach(({ dot: d, halo }) => { d.style.transformBox = 'fill-box'; d.style.transformOrigin = 'center'; halo.style.opacity = 0; });
      render(0);
      scroll((p) => render(prog(p)), { target: reading, offset: ['start start', 'end end'] });
    } else {
      // etapas: a figura fica no topo; cada etapa que chega ao meio da tela acende o seu ponto
      setDash(rPath, 0.12); setDash(axis, 0);
      const setActive = (k) => {
        steps.forEach((s, i) => s.classList.toggle('is-active', i === k));
        pts.forEach((g, i) => g.classList.toggle('is-on', i <= k));
        setDash(rPath, k < 0 ? 0.12 : k >= 4 ? 1 : frac[k]);
        setDash(axis, k >= 4 ? 1 : 0);
      };
      setActive(-1);
      const io = new IntersectionObserver((es) => {
        es.forEach((e) => { if (e.isIntersecting) setActive(e.target === endBlock ? 4 : steps.indexOf(e.target)); });
      }, { rootMargin: '-50% 0px -40% 0px' });
      [...steps, endBlock].forEach((n) => io.observe(n));
    }
  }

  /* ---- ESPECIALIDADES: cortina clara que se abre sobre o escuro (narrativa 2) ---- */
  const spec = $('[data-spec]');
  scroll((p) => {
    const t = prog(p);
    const x = ((1 - t) * 5).toFixed(2), r = ((1 - t) * 64).toFixed(1);
    spec.style.clipPath = `inset(0% ${x}% 0% ${x}% round ${r}px ${r}px 0px 0px)`;
  }, { target: spec, offset: ['start end', 'start 0.2'] });

  /* ---- títulos: máscara de linha ao entrar ---- */
  $$('[data-mask]').forEach((h) => {
    if (h.getBoundingClientRect().top < innerHeight) return;
    h.style.clipPath = 'inset(0% 0% 100% 0%)';
    h.style.transform = 'translateY(28px)';
    inView(h.parentElement, () => { animate(h, { clipPath: ['inset(0% 0% 100% 0%)', 'inset(0% 0% -14% 0%)'], transform: 'translateY(0px)' }, { duration: 1, ease: EASE_OUT }); }, { amount: 0.2 });
  });

  /* ---- SOBRE: retrato oval revelado por máscara + anel desenhado (narrativa 3) ---- */
  const oval = $('[data-oval]');
  if (oval && oval.getBoundingClientRect().top > innerHeight * 0.9) {
    const box = $('.about__oval', oval), img = $('img', oval), ring = $('[data-ring]', oval);
    box.style.clipPath = 'ellipse(0% 0% at 50% 60%)'; img.style.transform = 'scale(1.16)'; setDash(ring, 0);
    inView(oval, () => {
      animate(box, { clipPath: ['ellipse(0% 0% at 50% 60%)', 'ellipse(50% 50% at 50% 50%)'] }, { duration: 1.3, ease: EASE_IN_OUT });
      animate(img, { transform: ['scale(1.16)', 'scale(1)'] }, { duration: 1.8, ease: EASE_OUT });
      ring.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 1800, delay: 300, easing: EASE_IN_OUT_CSS, fill: 'forwards' });
    }, { amount: 0.3 });
  }

  /* ---- CONTATO: o perfil se redesenha, bem devagar ---- */
  const cPath = $('[data-contact-path]');
  if (cPath) {
    setDash(cPath, 0);
    inView($('[data-contact]'), () => {
      cPath.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 2600, easing: EASE_IN_OUT_CSS, fill: 'forwards' });
    }, { amount: 0.25 });
  }
}
