/* page-motion: o movimento próprio da Lume (ver page-motion.css).
   Tudo é decoração: sem este arquivo a página fica inteira e parada. */
const html = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
html.classList.add('pm-js');

/* ------------------------------------------------ visor do hero: liga após a entrada, timecode a 24 qps */
function viewfinder() {
  const vf = document.querySelector('.vf');
  if (!vf) return;
  const tc = vf.querySelector('.vf__tc');
  const hero = vf.closest('.hero');
  const on = () => vf.classList.add('is-on');
  if (hero?.classList.contains('is-entered')) on();
  else { new MutationObserver((_, mo) => { if (hero.classList.contains('is-entered')) { on(); mo.disconnect(); } }).observe(hero, { attributes: true, attributeFilter: ['class'] }); setTimeout(on, 1400); }
  if (!tc || reduced.matches) return;
  const pad = n => String(n).padStart(2, '0');
  let visible = true, t0 = performance.now(), raf = 0, last = -1;
  const tick = now => {
    const f = Math.floor((now - t0) / (1000 / 24));
    if (f !== last) {
      last = f;
      const s = Math.floor(f / 24);
      tc.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(f % 24)}`;
    }
    raf = visible ? requestAnimationFrame(tick) : 0;
  };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(tick); }).observe(vf);
  raf = requestAnimationFrame(tick);
}

/* ------------------------------------------------ barra de progresso */
function progressBar() {
  const bar = document.createElement('div');
  bar.className = 'pm-bar';
  bar.setAttribute('aria-hidden', 'true');
  document.body.append(bar);
  let pending = false;
  const set = () => {
    pending = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--pm-p', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0);
  };
  addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(set); } }, { passive: true });
  addEventListener('resize', set, { passive: true });
  set();
}

/* ------------------------------------------------ títulos que sobem (só os que ainda estão abaixo da tela) */
function headings() {
  const hs = [...document.querySelectorAll('main > section:not(.hero, [data-moment]) h2, footer.closing h2')];
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -12% 0px' });
  hs.forEach(h => {
    const inner = document.createElement('span');
    inner.className = 'pm-rise__in';
    inner.append(...h.childNodes);
    h.append(inner);
    h.classList.add('pm-rise');
    if (reduced.matches || h.getBoundingClientRect().top < innerHeight * 0.9) return;   // já na tela: fica como está
    h.classList.add('is-armed');
    io.observe(h);
  });
}

/* ------------------------------------------------ foco nas fotos dos trabalhos */
function focusFrames() {
  document.querySelectorAll('#trabalhos .frame').forEach(fr => {
    const f = document.createElement('span');
    f.className = 'pm-focus';
    f.setAttribute('aria-hidden', 'true');
    f.innerHTML = '<i></i><i></i><i></i><i></i><b></b>';
    fr.append(f);
    if (!finePointer.matches) return;
    fr.addEventListener('pointermove', e => {
      const r = fr.getBoundingClientRect();
      f.style.setProperty('--fx', `${((e.clientX - r.left) / r.width * 100).toFixed(1)}%`);
      f.style.setProperty('--fy', `${((e.clientY - r.top) / r.height * 100).toFixed(1)}%`);
    });
    fr.addEventListener('pointerleave', () => { f.style.removeProperty('--fx'); f.style.removeProperty('--fy'); });
  });
}

for (const fn of [viewfinder, progressBar, headings, focusFrames]) {
  try { fn(); } catch (e) { console.warn('page-motion:', fn.name, e); }
}
