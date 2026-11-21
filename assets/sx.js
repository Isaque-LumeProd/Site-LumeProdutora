/* sx: a rolagem imersiva da Lume. Cada [data-sx] recebe um progresso de 0 a 1 enquanto passa pela tela
   e a sua cena se move a partir dele:
     hero      a foto sai da coluna e cresce até a tela inteira; o texto sobe e some
     band      Luz. Câmera. Ação. acendem uma a uma; o play da marca abre e vira foto em tela cheia
     services  os três serviços correm na horizontal enquanto a página desce
     works     as fotos dos trabalhos andam em velocidades diferentes
     close     a foto do fechamento cresce até a largura toda
   Rolagem suave com Lenis (quando carregou). Sem script ou com movimento reduzido: o layout normal,
   parado (html sem .sx-on). */
const html = document.documentElement;
const reducedQ = matchMedia('(prefers-reduced-motion: reduce)');
if (!reducedQ.matches) start();

function start() {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => 1 - Math.pow(1 - t, 3);                      // ease-out cúbico
  const easeIO = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const seg = (p, a, b) => clamp((p - a) / (b - a));            // 0..1 dentro de [a, b]
  let vw = innerWidth, vh = innerHeight;

  // pinned: 0 quando o topo encosta no topo da tela, 1 quando o fim encosta no fim
  const pinned = el => { const r = el.getBoundingClientRect(); const t = r.height - vh; return t > 0 ? clamp(-r.top / t) : 0; };
  // pass: 0 quando o topo entra por baixo, 1 quando o fim sai por cima
  const pass = el => { const r = el.getBoundingClientRect(); return clamp((vh - r.top) / (vh + r.height)); };
  const near = el => { const r = el.getBoundingClientRect(); return r.bottom > -vh * .5 && r.top < vh * 1.5; };

  const scenes = [];

  /* ---------------------------------------------------------------- hero */
  const hero = document.querySelector('[data-sx="hero"]');
  if (hero) {
    const media = hero.querySelector('.hero__media');
    const text = hero.querySelector('.hero__text');
    const wrap = hero.querySelector(':scope > .wrap');
    const layer = hero.querySelector('.sx-layer');
    const img = layer?.querySelector('img');
    const vf = media?.querySelector('.vf');
    const end = layer?.querySelector('.sxh__end');
    if (media && text && wrap && layer && img) {
      if (vf) layer.append(vf);
      let box = null;                                    // o lugar da foto na coluna, relativo à tela fixa
      const measure = () => {
        const w = wrap.getBoundingClientRect(), m = media.getBoundingClientRect();
        const rad = parseFloat(getComputedStyle(media).borderTopLeftRadius) || 0;
        box = { t: m.top - w.top, l: m.left, r: vw - m.right, b: w.height - (m.bottom - w.top), rad };
      };
      scenes.push({
        el: hero, measure,
        update() {
          if (!box) measure();
          const p = pinned(hero);
          const g = easeIO(seg(p, 0, .62));                // a foto cresce
          const t = lerp(box.t, 0, g), l = lerp(box.l, 0, g), r = lerp(box.r, 0, g), b = lerp(box.b, 0, g);
          const rad = lerp(box.rad, 0, g);
          layer.style.clipPath = `inset(${t}px ${r}px ${b}px ${l}px round ${rad}px)`;
          if (vf) { vf.style.inset = `${t}px ${r}px ${b}px ${l}px`; }
          img.style.transform = `scale(${lerp(1.18, 1, ease(seg(p, 0, .8)))})`;
          layer.style.setProperty('--shade', (.45 * seg(p, .5, .85)).toFixed(3));
          const o = 1 - seg(p, .04, .34);                  // o texto sobe e some
          text.style.opacity = o.toFixed(3);
          text.style.transform = `translate3d(0, ${(-60 * seg(p, 0, .34)).toFixed(1)}px, 0)`;
          text.style.visibility = o < .01 ? 'hidden' : '';
          if (end) {
            const e = seg(p, .66, .86);
            end.style.opacity = e.toFixed(3);
            end.style.transform = `translate3d(0, ${(40 * (1 - ease(e))).toFixed(1)}px, 0)`;
          }
        },
      });
    }
  }

  /* ---------------------------------------------------------------- band: Luz. Câmera. Ação. */
  const band = document.querySelector('[data-sx="band"]');
  if (band) {
    const words = [...band.querySelectorAll('.sxb__words > span')];
    const play = band.querySelector('.sxb__play');
    const pimg = play?.querySelector('img');
    scenes.push({
      el: band,
      update() {
        const p = pinned(band);
        const out = 1 - seg(p, .58, .74);
        words.forEach((w, i) => {
          const on = ease(seg(p, .04 + i * .14, .16 + i * .14));
          w.style.opacity = ((.12 + .88 * on) * out).toFixed(3);
          w.style.transform = `translate3d(0, ${(24 * (1 - on)).toFixed(1)}px, 0) scale(${lerp(.94, 1, on).toFixed(4)})`;
          w.style.filter = on < 1 ? `blur(${(6 * (1 - on)).toFixed(2)}px)` : '';
        });
        if (play) {
          const appear = ease(seg(p, .4, .5));
          const grow = easeIO(seg(p, .5, .95));
          const cx = vw / 2, cy = vh / 2;
          const s = lerp(lerp(0, Math.min(vw, vh) * .16, appear), Math.max(vw, vh) * 4.2, grow);
          const pts = [[-.42, -.5], [.58, 0], [-.42, .5]].map(([x, y]) => `${(cx + x * s).toFixed(1)}px ${(cy + y * s).toFixed(1)}px`);
          play.style.clipPath = `polygon(${pts.join(',')})`;
          play.style.visibility = s < 1 ? 'hidden' : 'visible';
          if (pimg) {
            pimg.style.opacity = seg(p, .52, .72).toFixed(3);
            pimg.style.transform = `scale(${lerp(1.35, 1, grow).toFixed(4)})`;
          }
        }
      },
    });
  }

  /* ---------------------------------------------------------------- services: rolagem horizontal */
  const svc = document.querySelector('[data-sx="services"]');
  if (svc) {
    const view = svc.querySelector('.sxs__viewport');
    const track = svc.querySelector('.sxs__track');
    const cards = [...svc.querySelectorAll('.sxs__card')];
    const count = svc.querySelector('.sxs__count');
    const line = svc.querySelector('.sxs__line i');
    let dist = 0;
    const measure = () => { dist = Math.max(0, track.scrollWidth - view.clientWidth); };
    scenes.push({
      el: svc, measure,
      update() {
        const p = pinned(svc);
        const q = easeIO(seg(p, .06, .94));
        track.style.transform = `translate3d(${(-q * dist).toFixed(1)}px, 0, 0)`;
        let best = 0, bestD = Infinity;
        cards.forEach((c, i) => {
          const r = c.getBoundingClientRect();
          const off = (r.left + r.width / 2 - vw / 2) / vw;                  // -1..1 em relação ao centro
          const im = c.querySelector('img');
          if (im) im.style.transform = `translate3d(${(-off * 12).toFixed(2)}%, 0, 0) scale(1.18)`;
          c.style.setProperty('--focus', (1 - clamp(Math.abs(off) * 1.4)).toFixed(3));
          if (Math.abs(off) < bestD) { bestD = Math.abs(off); best = i; }
        });
        if (count) count.textContent = `${String(best + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
        if (line) line.style.transform = `scaleX(${q.toFixed(4)})`;
      },
    });
  }

  /* ---------------------------------------------------------------- works: velocidades diferentes */
  const works = document.querySelector('[data-sx="works"]');
  if (works) {
    const frames = [...works.querySelectorAll('.wall > .frame')];
    scenes.push({
      el: works,
      update() {
        const q = pass(works);
        const k = vw >= 1024 ? 1 : .45;
        const speeds = [0, 90, 170];
        frames.forEach((f, i) => {
          f.style.transform = `translate3d(0, ${((.5 - q) * 2 * speeds[i % 3] * k).toFixed(1)}px, 0)`;
        });
      },
    });
  }

  /* ---------------------------------------------------------------- close: a foto cresce */
  const close = document.querySelector('[data-sx="close"]');
  const cm = close?.querySelector('.close__media');
  if (cm) {
    scenes.push({
      el: close,
      update() {
        const q = ease(seg(pass(close), .05, .5));
        cm.style.transform = `scale(${lerp(.82, 1, q).toFixed(4)}, ${lerp(.7, 1, q).toFixed(4)})`;
        const im = cm.querySelector('img');
        if (im) im.style.transform = `scale(${lerp(1.3, 1, q).toFixed(4)})`;
      },
    });
  }

  if (!scenes.length) return;
  html.classList.add('sx-on');

  const measureAll = () => { vw = innerWidth; vh = innerHeight; scenes.forEach(s => s.measure?.()); };
  // a medida do hero é feita com a foto ainda no lugar (antes de qualquer progresso)
  const remeasure = () => {
    html.classList.add('sx-measure');
    scenes.forEach(s => { if (s.el === hero) { const tx = s.el.querySelector('.hero__text'); tx.style.transform = ''; } });
    measureAll();
    html.classList.remove('sx-measure');
    frame(true);
  };

  let lastY = -1, dirty = true;
  function frame(force) {
    const y = scrollY;
    if (!force && !dirty && y === lastY) return;
    lastY = y; dirty = false;
    for (const s of scenes) { if (force || near(s.el)) { try { s.update(); } catch (e) { console.warn('sx:', e); } } }
  }

  measureAll();
  frame(true);
  addEventListener('resize', () => { clearTimeout(remeasure.t); remeasure.t = setTimeout(remeasure, 120); dirty = true; }, { passive: true });
  document.fonts?.ready.then(remeasure);
  addEventListener('load', remeasure, { once: true });

  // rolagem suave: Lenis anima o scroll da janela; sem ele, o scroll nativo
  let lenis = null;
  if (window.Lenis && matchMedia('(pointer: fine)').matches) {
    try {
      lenis = new window.Lenis({ lerp: .09, wheelMultiplier: 1 });
      html.classList.add('sx-smooth');
      document.addEventListener('click', e => {
        const a = e.target.closest('a[href^="#"]');
        if (!a || e.defaultPrevented) return;
        const id = a.getAttribute('href');
        const el = id.length > 1 && document.querySelector(id);
        if (!el) return;
        e.preventDefault();
        lenis.scrollTo(el, { offset: 0, duration: 1.4 });
        history.replaceState(null, '', id);
      });
    } catch (e) { console.warn('sx: lenis', e); lenis = null; }
  }
  const loop = t => { lenis?.raf(t); frame(false); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);

  reducedQ.addEventListener?.('change', () => location.reload());
}
