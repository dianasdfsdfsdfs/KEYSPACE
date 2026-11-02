<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import LogoMark from './LogoMark.vue';
import { scrollState, scrollToTarget } from '../../lib/scroll.js';

const links = [
  { id: 'history', label: 'History' },
  { id: 'hashing', label: 'Hashing' },
  { id: 'lab', label: 'Password Lab' },
  { id: 'defend', label: 'Defend' },
];
const active = ref('');
let io;

onMounted(() => {
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) active.value = e.target.id;
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  ['top', ...links.map((l) => l.id)].forEach((id) => {
    const node = document.getElementById(id);
    if (node) io.observe(node);
  });
});
onBeforeUnmount(() => io?.disconnect());

function go(id, e) {
  e?.preventDefault();
  scrollToTarget(`#${id}`);
}
</script>

<template>
  <header class="header" :class="{ 'is-scrolled': scrollState.y > 24 }">
    <div class="header__inner">
      <a href="#top" class="brand" aria-label="KEYSPACE — back to top" @click="go('top', $event)">
        <LogoMark />
        <span class="brand__word"><span class="acid">KEY</span>SPACE</span>
      </a>

      <nav class="nav" aria-label="Sections">
        <a
          v-for="(l, i) in links"
          :key="l.id"
          :href="`#${l.id}`"
          class="nav__link"
          :class="{ 'is-active': active === l.id }"
          @click="go(l.id, $event)"
        >
          <span class="nav__num">0{{ i + 1 }}</span>{{ l.label }}
        </a>
      </nav>

      <div class="header__right">
        <span class="status"><i class="status__dot"></i>Runs locally</span>
        <a href="#lab" class="btn btn--primary btn--sm" @click="go('lab', $event)">Test a password</a>
      </div>
    </div>
    <div class="progress" aria-hidden="true">
      <div class="progress__bar" :style="{ transform: `scaleX(${scrollState.progress})` }"></div>
    </div>
  </header>
</template>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  height: var(--header-h);
  transition:
    background 0.4s,
    border-color 0.4s,
    backdrop-filter 0.4s;
  border-bottom: 1px solid transparent;
}
.header.is-scrolled {
  background: rgba(3, 5, 3, 0.72);
  backdrop-filter: blur(14px) saturate(1.2);
  -webkit-backdrop-filter: blur(14px) saturate(1.2);
  border-bottom-color: var(--line);
}
.header__inner {
  height: 100%;
  max-width: var(--maxw);
  margin: 0 auto;
  padding: 0 var(--gutter);
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 24px;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: var(--text);
  text-decoration: none !important;
  justify-self: start;
}
.brand__word {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 0.16em;
}
.nav {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: rgba(5, 8, 5, 0.55);
  backdrop-filter: blur(10px);
}
.nav__link {
  position: relative;
  display: inline-flex;
  align-items: baseline;
  gap: 7px;
  padding: 8px 15px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-2);
  text-decoration: none !important;
  transition:
    color 0.25s,
    background 0.25s;
}
.nav__num {
  font-size: 10px;
  color: var(--muted);
}
.nav__link:hover {
  color: var(--text);
  background: rgba(var(--acid-rgb), 0.06);
}
.nav__link.is-active {
  color: #050705;
  background: var(--acid);
}
.nav__link.is-active .nav__num {
  color: rgba(5, 7, 5, 0.6);
}
.header__right {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 18px;
}
.status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.status__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--acid);
  box-shadow: 0 0 10px var(--acid);
  animation: pulse 2.2s ease-in-out infinite;
}
@keyframes pulse {
  50% {
    opacity: 0.35;
  }
}
.progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  overflow: hidden;
}
.progress__bar {
  height: 100%;
  transform-origin: 0 50%;
  background: linear-gradient(90deg, var(--acid), var(--yellow));
  box-shadow: 0 0 12px rgba(var(--acid-rgb), 0.8);
}

@media (max-width: 1080px) {
  .status {
    display: none;
  }
}
@media (max-width: 860px) {
  .header__inner {
    grid-template-columns: 1fr auto;
  }
  .nav {
    display: none;
  }
}
</style>
