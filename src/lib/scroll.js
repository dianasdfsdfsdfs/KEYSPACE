import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { reactive } from 'vue';

gsap.registerPlugin(ScrollTrigger);

/** Shared, reactive scroll state for the UI and the background scene. */
export const scrollState = reactive({ y: 0, progress: 0, velocity: 0, limit: 1, vh: 800 });

let lenis = null;

export function initScroll() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  scrollState.vh = window.innerHeight;
  window.addEventListener('resize', () => (scrollState.vh = window.innerHeight));

  if (reduce) {
    const onScroll = () => {
      const limit = document.documentElement.scrollHeight - window.innerHeight;
      scrollState.y = window.scrollY;
      scrollState.limit = limit;
      scrollState.progress = limit > 0 ? window.scrollY / limit : 0;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return null;
  }

  lenis = new Lenis({ lerp: 0.105, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.4 });
  lenis.on('scroll', (e) => {
    scrollState.y = e.scroll;
    scrollState.limit = e.limit;
    scrollState.progress = e.limit > 0 ? e.scroll / e.limit : 0;
    scrollState.velocity = e.velocity;
    ScrollTrigger.update();
  });
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export function scrollToTarget(target, opts = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: -72, duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4), ...opts });
  else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** v-reveal: fade/slide content in the first time it enters the viewport. */
export const vReveal = {
  mounted(el, binding) {
    el.classList.add('reveal');
    if (binding.value != null) el.style.setProperty('--d', `${binding.value}s`);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-in');
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    el._revealIO = io;
  },
  unmounted(el) {
    el._revealIO?.disconnect();
  },
};
