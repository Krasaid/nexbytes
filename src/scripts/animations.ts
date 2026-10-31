/**
 * Único módulo de animaciones. Los componentes no tienen lógica de animación:
 * solo marcan elementos con atributos.
 *
 *   data-anim="fade-up"      aparece subiendo (ScrollTrigger; en grids se escalona)
 *   data-anim="draw-line"    línea que se dibuja de izquierda a derecha (scaleX)
 *   data-anim="split-words"  título que sube palabra por palabra, siempre visible (solo hero)
 *   data-anim="rise"         sube sin desvanecerse, siempre visible (solo hero)
 *   data-anim="draw-border"  tarjeta cuyo borde se dibuja (solo hero)
 *   data-anim-delay="0.1"    retraso en segundos (en el hero: posición en la línea de tiempo)
 *   data-anim-scope="hero"   contenedor animado por la entrada, no por scroll
 *
 * Reglas:
 * - El HTML nunca oculta nada. Un script inline en Base.astro agrega la clase
 *   `anim` a <html> (solo con JS y sin movimiento reducido) y global.css oculta
 *   los estados iniciales bajo esa clase. Si este módulo no llega a correr,
 *   el script inline quita la clase a los 1.5 s y todo queda visible.
 * - Solo se animan opacity y transform: no hay saltos de layout (CLS = 0).
 * - El título y el subtítulo del hero nunca pasan por opacity 0: son el LCP y
 *   deben pintarse con el primer render, aunque el JS tarde en llegar.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const HERO = '[data-anim-scope="hero"]';
const EASE = 'power3.out';

const root = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reducedMotion && root.classList.contains('anim')) {
  gsap.registerPlugin(ScrollTrigger);
  root.dataset.animReady = 'true';
  initHero();
  initFadeUp();
  initDrawLines();
}

function delayOf(el: Element, fallback: number): number {
  const value = Number.parseFloat((el as HTMLElement).dataset.animDelay ?? '');
  return Number.isFinite(value) ? value : fallback;
}

function outsideHero<T extends Element>(els: T[]): T[] {
  return els.filter((el) => !el.closest(HERO));
}

/** Envuelve cada palabra en un span animable. El texto accesible queda en aria-label. */
function splitWords(el: HTMLElement): HTMLElement[] {
  const text = (el.textContent ?? '').trim();
  const words = text.split(/\s+/);
  el.setAttribute('aria-label', text);
  el.textContent = '';
  return words.map((word, i) => {
    const span = document.createElement('span');
    span.textContent = word;
    span.setAttribute('aria-hidden', 'true');
    span.style.display = 'inline-block';
    el.append(span);
    if (i < words.length - 1) el.append(' ');
    return span;
  });
}

// ── Entrada del hero ─────────────────────────────────────────────────

function initHero() {
  const scope = document.querySelector<HTMLElement>(HERO);
  if (!scope) return;

  // El texto termina de entrar antes de 0.8 s; el borde de la tarjeta es decorativo.
  const tl = gsap.timeline({ defaults: { duration: 0.5, ease: EASE } });

  scope.querySelectorAll<HTMLElement>('[data-anim]').forEach((el) => {
    const at = delayOf(el, 0);

    switch (el.dataset.anim) {
      case 'split-words': {
        // El desplazamiento inicial (CSS) pasa del título a cada palabra en el
        // mismo frame: no hay salto visible.
        const words = splitWords(el);
        gsap.set(el, { y: 0 });
        tl.fromTo(words, { y: 16 }, { y: 0, stagger: 0.03 }, at);
        break;
      }
      case 'rise':
        tl.fromTo(el, { y: 16 }, { y: 0, duration: 0.6 }, at);
        break;
      case 'draw-border':
        drawBorder(tl, el, at);
        break;
      default:
        tl.fromTo(el, { opacity: 0, y: 24 }, { opacity: 1, y: 0 }, at);
    }
  });
}

/** Tarjeta: el borde se dibuja con un <rect> SVG y al final se cambia por el borde CSS. */
function drawBorder(tl: gsap.core.Timeline, card: HTMLElement, at: number) {
  const outline = card.querySelector<SVGSVGElement>('[data-anim-part="outline"]');
  const rect = outline?.querySelector('rect');
  const corners = card.querySelectorAll('[data-anim-part="corner"]');
  const content = card.querySelectorAll('[data-anim-part="content"]');
  const drawEnd = at + 1;

  tl.set(card, { opacity: 1, borderColor: 'transparent' }, at);

  if (outline && rect) {
    rect.setAttribute('width', String(card.offsetWidth - 1));
    rect.setAttribute('height', String(card.offsetHeight - 1));
    tl.set(outline, { opacity: 1 }, at);
    // Se anima el atributo (no la propiedad CSS), que sí interpola de forma continua.
    tl.fromTo(
      rect,
      { attr: { 'stroke-dashoffset': 1 } },
      { attr: { 'stroke-dashoffset': 0 }, duration: 1, ease: 'power2.inOut' },
      at,
    );
  }

  tl.fromTo(content, { opacity: 0, y: 8 }, { opacity: 1, y: 0, stagger: 0.1 }, at + 0.2);
  tl.fromTo(corners, { scale: 0 }, { scale: 1, duration: 0.4, stagger: 0.1 }, at + 0.8);
  tl.set(card, { clearProps: 'borderColor' }, drawEnd);
  if (outline) tl.set(outline, { opacity: 0 }, drawEnd);
}

// ── Scroll ───────────────────────────────────────────────────────────

function initFadeUp() {
  const els = outsideHero(gsap.utils.toArray<HTMLElement>('[data-anim="fade-up"]'));
  gsap.set(els, { opacity: 0, y: 24 });

  // batch agrupa lo que entra a la vez (p. ej. una fila de un grid) y lo escalona.
  ScrollTrigger.batch(els, {
    start: 'top 88%',
    once: true,
    onEnter: (batch) => {
      batch.forEach((el, i) => {
        gsap.to(el, { opacity: 1, y: 0, duration: 0.7, ease: EASE, delay: delayOf(el, i * 0.08) });
      });
    },
  });
}

function initDrawLines() {
  outsideHero(gsap.utils.toArray<HTMLElement>('[data-anim="draw-line"]')).forEach((el) => {
    gsap.fromTo(
      el,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: 1,
        ease: 'power2.out',
        delay: delayOf(el, 0),
        scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      },
    );
  });
}
