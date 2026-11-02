<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

/**
 * Text that "decrypts" itself: each character flickers through random glyphs
 * before locking in, left to right. Layout is reserved by the real characters,
 * so nothing reflows while it animates.
 */
const props = defineProps({
  text: { type: String, required: true },
  tag: { type: String, default: 'span' },
  delay: { type: Number, default: 0 },
  stagger: { type: Number, default: 0.028 },
  scramble: { type: Number, default: 0.45 },
  charset: { type: String, default: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*<>/{}' },
  onView: { type: Boolean, default: true },
  hover: { type: Boolean, default: false },
});

const el = ref(null);
const chars = computed(() => [...props.text]);
// 0 = hidden, 1 = scrambling, 2 = locked
const cells = ref(chars.value.map(() => ({ s: 0, g: '' })));
let raf = 0;
let io;
let started = false;

function run() {
  cancelAnimationFrame(raf);
  const list = chars.value;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    cells.value = list.map(() => ({ s: 2, g: '' }));
    return;
  }
  cells.value = list.map(() => ({ s: 0, g: '' }));
  const t0 = performance.now() + props.delay * 1000;
  let lastSwap = 0;
  const step = (now) => {
    const t = (now - t0) / 1000;
    const swap = now - lastSwap > 50;
    if (swap) lastSwap = now;
    let done = true;
    const next = cells.value;
    for (let i = 0; i < list.length; i++) {
      const c = next[i];
      if (list[i] === ' ') {
        c.s = 2;
        continue;
      }
      const appear = i * props.stagger;
      if (t < appear) {
        done = false;
        c.s = 0;
      } else if (t < appear + props.scramble) {
        done = false;
        if (c.s !== 1 || swap) c.g = props.charset[(Math.random() * props.charset.length) | 0];
        c.s = 1;
      } else c.s = 2;
    }
    if (!done) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}

onMounted(() => {
  if (!props.onView) {
    started = true;
    run();
    return;
  }
  io = new IntersectionObserver(
    ([e]) => {
      if (e.isIntersecting && !started) {
        started = true;
        run();
        io.disconnect();
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  io.observe(el.value);
});

watch(
  () => props.text,
  () => {
    cells.value = chars.value.map(() => ({ s: started ? 0 : 0, g: '' }));
    if (started) run();
  },
);

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  io?.disconnect();
});

function onEnter() {
  if (props.hover) run();
}
</script>

<template>
  <component :is="tag" ref="el" class="decrypt" :aria-label="text" @mouseenter="onEnter">
    <span aria-hidden="true"
      ><span v-for="(c, i) in chars" :key="i" class="ch"
        ><span class="ch__final" :class="{ on: cells[i]?.s === 2 }">{{ c }}</span
        ><span v-if="cells[i]?.s === 1" class="ch__glyph">{{ cells[i].g }}</span></span
      ></span
    >
  </component>
</template>

<style scoped>
.ch {
  position: relative;
}
.ch__final {
  opacity: 0;
}
.ch__final.on {
  opacity: 1;
}
.ch__glyph {
  position: absolute;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
  color: var(--acid);
  font-family: var(--font-mono);
  font-weight: 500;
  opacity: 0.9;
}
</style>
