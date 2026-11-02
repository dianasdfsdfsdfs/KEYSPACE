<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import StationShell from '../StationShell.vue';
import SpecimenFrame from '../SpecimenFrame.vue';
import ThreeCanvas from '../../three/ThreeCanvas.vue';
import { Enigma } from '../../../crypto/enigma.js';

defineProps({ station: Object, reverse: Boolean });

const start = ref(['A', 'A', 'A']);
let machine = new Enigma({ positions: start.value.join('') });
const s = reactive({ positions: machine.positions, last: null, xray: true, input: '', output: '', resetId: 0 });
let id = 0;
let demoTimer = null;

const params = computed(() => ({ positions: s.positions, last: s.last, xray: s.xray, resetId: s.resetId }));
const group5 = (str) => str.replace(/(.{5})/g, '$1 ').trim();
const status = computed(() => `Rotors ${s.positions.split('').join(' ')}`);

function press(letter) {
  const L = letter.toUpperCase();
  if (!/^[A-Z]$/.test(L)) return;
  const r = machine.press(L);
  s.positions = r.positions;
  s.last = { ...r, id: ++id };
  s.input = (s.input + L).slice(-40);
  s.output = (s.output + r.output).slice(-40);
}
function reset() {
  stopDemo();
  machine = new Enigma({ positions: start.value.join('') });
  s.positions = machine.positions;
  s.input = '';
  s.output = '';
  s.last = null;
  s.resetId++;
}
function bump(i, d) {
  const c = (start.value[i].charCodeAt(0) - 65 + d + 26) % 26;
  start.value[i] = String.fromCharCode(65 + c);
  reset();
}
function demo(word = 'HELLOHELLO') {
  stopDemo();
  let i = 0;
  demoTimer = setInterval(() => {
    if (i >= word.length) return stopDemo();
    press(word[i++]);
  }, 1150);
}
function stopDemo() {
  clearInterval(demoTimer);
  demoTimer = null;
}

// Type on the real keyboard while the machine is on screen.
const el = ref(null);
let visible = false;
let io;
const onKey = (e) => {
  if (!visible || e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (/^[a-z]$/i.test(e.key)) {
    stopDemo();
    press(e.key);
  }
};
onMounted(() => {
  window.addEventListener('keydown', onKey);
  io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.35 });
  io.observe(el.value);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey);
  io?.disconnect();
  stopDemo();
});
function onEvent(name, v) {
  if (name === 'key') {
    stopDemo();
    press(v);
  }
}
const lastPair = computed(() => (s.last ? { a: s.last.input, b: s.last.output } : null));
</script>

<template>
  <StationShell :station="station" :reverse="reverse">
    <div ref="el">
      <SpecimenFrame fig="05" title="Enigma I · rotors I-II-III · UKW-B" :status="status" hint="Click keys or type">
        <template #scene>
          <ThreeCanvas
            :load="() => import('../../../three/models/enigma.js')"
            :params="params"
            :stage="{ dprMax: 1.75 }"
            label="An Enigma machine: keyboard, lampboard and three rotors. Press a key to light a lamp; the wiring path through the rotors can be shown."
            @event="onEvent"
          />
        </template>
        <template #overlay>
          <div v-if="lastPair" class="pair" aria-live="polite">
            <span class="pair__in">{{ lastPair.a }}</span>
            <span class="pair__arrow">→</span>
            <span class="pair__out">{{ lastPair.b }}</span>
          </div>
        </template>
        <template #controls>
          <div class="top">
            <div class="field">
              <span class="field__label">Rotor start positions</span>
              <div class="rotors">
                <div v-for="(c, i) in start" :key="i" class="rotor">
                  <button type="button" :aria-label="`Rotor ${i + 1} up`" @click="bump(i, 1)">▲</button>
                  <span>{{ c }}</span>
                  <button type="button" :aria-label="`Rotor ${i + 1} down`" @click="bump(i, -1)">▼</button>
                </div>
              </div>
            </div>
            <div class="actions">
              <button type="button" class="btn btn--primary btn--sm" @click="demo()">Type HELLO HELLO</button>
              <button type="button" class="btn btn--ghost btn--sm" :class="{ on: s.xray }" @click="s.xray = !s.xray">
                {{ s.xray ? 'Hide the wiring' : 'Show the wiring' }}
              </button>
              <button type="button" class="btn btn--ghost btn--sm" @click="reset">Reset</button>
            </div>
          </div>
          <dl class="readout">
            <div>
              <dt>You typed</dt>
              <dd>{{ group5(s.input) || '—' }}</dd>
            </div>
            <div>
              <dt>Lamps lit</dt>
              <dd class="yellow">{{ group5(s.output) || '—' }}</dd>
            </div>
          </dl>
          <p class="note">
            Type the same letter twice: it lights two different lamps, because the rotors moved. And watch: a letter never
            lights itself. Codebreakers turned that one flaw into a weapon.
          </p>
        </template>
      </SpecimenFrame>
    </div>
  </StationShell>
</template>

<style scoped>
.top {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.rotors {
  display: flex;
  gap: 8px;
}
.rotor {
  display: grid;
  grid-template-rows: 18px 34px 18px;
  width: 44px;
  border: 1px solid var(--line-2);
  border-radius: 10px;
  overflow: hidden;
  background: #d9d2bd;
  text-align: center;
}
.rotor span {
  display: grid;
  place-items: center;
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 18px;
  color: #1b1a14;
}
.rotor button {
  border: 0;
  background: #1b1d16;
  color: var(--acid);
  font-size: 9px;
  line-height: 1;
}
.rotor button:hover {
  background: #2a3221;
}
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.btn.on {
  border-color: var(--acid);
  color: var(--acid);
}
.note {
  margin-top: 12px;
  font-size: 13.5px;
  color: var(--text-2);
}
.pair {
  position: absolute;
  left: 18px;
  bottom: 14px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border-radius: 10px;
  border: 1px solid var(--line-2);
  background: rgba(3, 6, 3, 0.78);
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 700;
}
.pair__in {
  color: var(--acid);
}
.pair__arrow {
  font-size: 14px;
  color: var(--muted);
}
.pair__out {
  color: var(--yellow);
  text-shadow: 0 0 14px rgba(238, 255, 0, 0.6);
}
</style>
