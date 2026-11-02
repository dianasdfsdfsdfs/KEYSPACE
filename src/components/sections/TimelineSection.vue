<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { STATIONS } from '../../content/stations.js';
import { scrollToTarget } from '../../lib/scroll.js';
import ScytaleStation from '../timeline/stations/ScytaleStation.vue';
import CaesarStation from '../timeline/stations/CaesarStation.vue';
import FrequencyStation from '../timeline/stations/FrequencyStation.vue';
import VigenereStation from '../timeline/stations/VigenereStation.vue';
import EnigmaStation from '../timeline/stations/EnigmaStation.vue';
import AesStation from '../timeline/stations/AesStation.vue';
import PublicKeyStation from '../timeline/stations/PublicKeyStation.vue';
import QuantumStation from '../timeline/stations/QuantumStation.vue';

const components = {
  scytale: ScytaleStation,
  caesar: CaesarStation,
  frequency: FrequencyStation,
  vigenere: VigenereStation,
  enigma: EnigmaStation,
  aes: AesStation,
  publickey: PublicKeyStation,
  quantum: QuantumStation,
};
const list = STATIONS.filter((s) => components[s.id]);
const active = ref(list[0].id);
let io;

onMounted(() => {
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) active.value = e.target.dataset.station;
    },
    { rootMargin: '-45% 0px -45% 0px' },
  );
  document.querySelectorAll('[data-station]').forEach((el) => io.observe(el));
});
onBeforeUnmount(() => io?.disconnect());
</script>

<template>
  <section id="history" class="section timeline">
    <div class="container">
      <header class="timeline__head">
        <p class="label" v-reveal>Part one · History</p>
        <h2 class="section-title" v-reveal="0.05">2,500 years of <em>hiding messages</em></h2>
        <p class="lead" v-reveal="0.1">
          Eight inventions, each one built to fix the weakness of the last. Play with every machine: type your own
          message, then see how codebreakers got in.
        </p>
      </header>

      <div class="timeline__body">
        <nav class="rail" aria-label="Timeline">
          <ol>
            <li v-for="st in STATIONS" :key="st.id" :class="{ on: active === st.id }">
              <a :href="`#st-${st.id}`" @click.prevent="scrollToTarget(`#st-${st.id}`)">
                <span class="rail__year">{{ st.railYear }}</span>
                <span class="rail__name">{{ st.title }}</span>
              </a>
            </li>
          </ol>
        </nav>

        <div class="timeline__stations">
          <component :is="components[st.id]" v-for="(st, i) in list" :key="st.id" :station="st" :reverse="i % 2 === 1" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.timeline {
  padding-top: clamp(80px, 14vh, 160px);
}
.timeline__head {
  max-width: 820px;
  display: grid;
  gap: 18px;
  margin-bottom: clamp(24px, 6vh, 64px);
}
.timeline__body {
  display: grid;
  grid-template-columns: var(--rail-w) minmax(0, 1fr);
  gap: clamp(20px, 3vw, 48px);
}
.rail {
  position: relative;
}
.rail ol {
  position: sticky;
  top: calc(var(--header-h) + 64px);
  list-style: none;
  margin: 0;
  padding: 8px 0 8px 18px;
  border-left: 1px solid var(--line-2);
  display: grid;
  gap: 4px;
}
.rail li a {
  position: relative;
  display: grid;
  gap: 2px;
  padding: 8px 0;
  text-decoration: none !important;
  color: var(--muted);
  transition: color 0.3s;
}
.rail li a::before {
  content: '';
  position: absolute;
  left: -23px;
  top: 14px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--bg);
  border: 1px solid var(--line-strong);
  transition:
    background 0.3s,
    box-shadow 0.3s,
    border-color 0.3s;
}
.rail li.on a {
  color: var(--text);
}
.rail li.on a::before {
  background: var(--acid);
  border-color: var(--acid);
  box-shadow: 0 0 12px var(--acid);
}
.rail li a:hover {
  color: var(--text-2);
}
.rail__year {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--acid);
  opacity: 0.8;
}
.rail__name {
  font-size: 13px;
  line-height: 1.3;
}
@media (max-width: 1180px) {
  .timeline__body {
    grid-template-columns: 1fr;
  }
  .rail {
    display: none;
  }
}
</style>
