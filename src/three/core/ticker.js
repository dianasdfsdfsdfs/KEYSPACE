import { gsap } from 'gsap';

// One animation loop for the whole site: GSAP's ticker drives Lenis smooth
// scrolling, every GSAP tween and every Three.js stage, so they never drift
// apart or fight over requestAnimationFrame.
const subscribers = new Set();
let attached = false;
// `?capture` (used for automated screenshots on slow software renderers)
// lets simulation time keep up with wall time at low frame rates.
const MAX_DT = typeof location !== 'undefined' && /[?&]capture\b/.test(location.search) ? 1.0 : 1 / 20;

function tick(time, deltaMs) {
  const dt = Math.min(deltaMs / 1000, MAX_DT); // clamp long frames (tab switches)
  for (const fn of subscribers) fn(dt, time);
}

export function addTick(fn) {
  subscribers.add(fn);
  if (!attached) {
    gsap.ticker.add(tick);
    attached = true;
  }
  return () => {
    subscribers.delete(fn);
    if (attached && subscribers.size === 0) {
      gsap.ticker.remove(tick);
      attached = false;
    }
  };
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Frame-rate independent smoothing (exponential decay).
export const damp = (current, target, lambda, dt) => current + (target - current) * (1 - Math.exp(-lambda * dt));

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutBack = (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
