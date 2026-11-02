<script setup>
import { computed, reactive, ref, watch } from 'vue';
import StationShell from '../StationShell.vue';
import SpecimenFrame from '../SpecimenFrame.vue';
import ThreeCanvas from '../../three/ThreeCanvas.vue';
import { ALPHABET, caesar, uncaesar, cleanText } from '../../../crypto/classical.js';

defineProps({ station: Object, reverse: Boolean });

const SECRET_PLAIN = 'MEET ME AT THE FORUM AT NOON';
const SECRET_KEY = 11;
const intercepted = caesar(SECRET_PLAIN, SECRET_KEY);

const s = reactive({ mode: 'encrypt', text: 'VENI VIDI VICI', shift: 3, guess: 1, brute: false, bruteAt: 0 });
const cursor = ref(-1);

const plain = computed(() => cleanText(s.text, 40) || 'VENI VIDI VICI');
const cipher = computed(() => caesar(plain.value, s.shift));
const candidate = computed(() => uncaesar(intercepted, s.guess));
const cracked = computed(() => s.mode === 'crack' && s.guess === SECRET_KEY);
const shifted = computed(() => [...ALPHABET].map((_, i) => ALPHABET[(i + (s.mode === 'crack' ? s.guess : s.shift)) % 26]));
const activeLetter = computed(() => {
  const src = s.mode === 'crack' ? candidate.value : plain.value;
  const ch = src[cursor.value];
  return ch && /[A-Z]/.test(ch) ? ch.charCodeAt(0) - 65 : -1;
});
const allKeys = computed(() => Array.from({ length: 25 }, (_, i) => ({ k: i + 1, text: uncaesar(intercepted, i + 1) })));

const params = computed(() =>
  s.mode === 'crack'
    ? { text: candidate.value, shift: s.brute ? s.bruteAt || 1 : s.guess, brute: s.brute }
    : { text: plain.value, shift: s.shift, brute: false },
);

const status = computed(() => {
  if (s.mode === 'encrypt') return `Shift ${s.shift}`;
  if (s.brute) return `Trying key ${s.bruteAt || 1}/25`;
  return cracked.value ? 'Cracked' : `Guess ${s.guess}`;
});
const tone = computed(() => (s.mode === 'crack' ? (cracked.value ? 'acid' : s.brute ? 'yellow' : 'danger') : 'acid'));

function onEvent(name, v) {
  if (name === 'cursor') cursor.value = v;
  if (name === 'shift') {
    if (s.mode === 'crack') s.guess = v;
    else s.shift = v;
  }
  if (name === 'brute') {
    s.bruteAt = v;
    if (v === SECRET_KEY) {
      setTimeout(() => {
        s.brute = false;
        s.guess = SECRET_KEY;
      }, 600);
    }
  }
}
function startBrute() {
  s.bruteAt = 0;
  s.brute = true;
}
watch(
  () => s.mode,
  () => {
    s.brute = false;
    cursor.value = -1;
  },
);
const fill = (v, max) => `${((v - 1) / (max - 1)) * 100}%`;
</script>

<template>
  <StationShell :station="station" :reverse="reverse">
    <SpecimenFrame fig="02" title="Cipher disk · 26 sectors" :status="status" :status-tone="tone" hint="Drag the inner disk">
      <template #scene>
        <ThreeCanvas
          :load="() => import('../../../three/models/caesar.js')"
          :params="params"
          label="A two-ring cipher disk: plaintext letters on the outer ring, shifted letters on the inner disk."
          @event="onEvent"
        />
      </template>
      <template #controls>
        <div class="tabs" role="tablist">
          <button type="button" role="tab" :aria-selected="s.mode === 'encrypt'" :class="{ on: s.mode === 'encrypt' }" @click="s.mode = 'encrypt'">Encrypt</button>
          <button type="button" role="tab" :aria-selected="s.mode === 'crack'" :class="{ on: s.mode === 'crack' }" @click="s.mode = 'crack'">Crack a message</button>
        </div>

        <template v-if="s.mode === 'encrypt'">
          <div class="row2">
            <label class="field">
              <span class="field__label">Your message</span>
              <input v-model="s.text" class="input" maxlength="40" spellcheck="false" autocomplete="off" />
            </label>
            <label class="field">
              <span class="field__label">Shift · {{ s.shift }}</span>
              <input v-model.number="s.shift" class="range" type="range" min="1" max="25" :style="{ '--fill': fill(s.shift, 25) }" />
            </label>
          </div>
          <dl class="readout">
            <div>
              <dt>Ciphertext</dt>
              <dd class="out">
                <span v-for="(ch, i) in cipher" :key="i" :class="{ cur: i === cursor }">{{ ch }}</span>
              </dd>
            </div>
          </dl>
        </template>

        <template v-else>
          <p class="intercept"><span class="label label--yellow">Intercepted</span> <span class="mono">{{ intercepted }}</span></p>
          <div class="row2">
            <label class="field">
              <span class="field__label">Try a key · {{ s.guess }}</span>
              <input v-model.number="s.guess" class="range" type="range" min="1" max="25" :disabled="s.brute" :style="{ '--fill': fill(s.guess, 25) }" />
            </label>
            <button type="button" class="btn btn--ghost btn--sm" :disabled="s.brute" @click="startBrute">Try all 25 keys</button>
          </div>
          <dl class="readout">
            <div>
              <dt>Decrypted</dt>
              <dd class="out" :class="{ ok: cracked }">{{ candidate }}</dd>
            </div>
          </dl>
          <p v-if="cracked" class="win">✓ Cracked with key {{ SECRET_KEY }}. You just ran a brute-force attack: try every key until one makes sense.</p>
          <ol v-if="s.brute" class="brute mono">
            <li v-for="row in allKeys" :key="row.k" :class="{ cur: row.k === s.bruteAt, hit: row.k === SECRET_KEY && s.bruteAt >= SECRET_KEY }">
              <span>{{ String(row.k).padStart(2, '0') }}</span>{{ row.text }}
            </li>
          </ol>
        </template>

        <div class="table mono" aria-hidden="true">
          <div class="table__row">
            <span v-for="(ch, i) in ALPHABET" :key="i" :class="{ cur: i === activeLetter }">{{ ch }}</span>
          </div>
          <div class="table__row table__row--c">
            <span v-for="(ch, i) in shifted" :key="i" :class="{ cur: i === activeLetter }">{{ ch }}</span>
          </div>
        </div>
      </template>
    </SpecimenFrame>
  </StationShell>
</template>

<style scoped>
.tabs {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  margin-bottom: 16px;
  border: 1px solid var(--line-2);
  border-radius: 999px;
}
.tabs button {
  height: 32px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-2);
}
.tabs button.on {
  background: var(--acid);
  color: #050705;
}
.row2 {
  display: grid;
  grid-template-columns: 1fr minmax(180px, 0.8fr);
  gap: 16px;
  align-items: end;
  margin-bottom: 14px;
}
.out {
  font-size: 18px !important;
  color: var(--acid) !important;
}
.out span {
  display: inline-block;
  min-width: 0.62em;
  transition:
    color 0.2s,
    text-shadow 0.2s,
    transform 0.2s;
}
.out span.cur {
  color: var(--yellow);
  text-shadow: 0 0 12px var(--yellow);
  transform: translateY(-2px);
}
.out.ok {
  color: var(--yellow) !important;
  text-shadow: 0 0 14px rgba(238, 255, 0, 0.5);
}
.intercept {
  display: flex;
  gap: 12px;
  align-items: baseline;
  flex-wrap: wrap;
  margin-bottom: 14px;
  font-size: 15px;
  letter-spacing: 0.1em;
  color: var(--danger);
}
.win {
  margin-top: 10px;
  font-size: 14px;
  color: var(--acid);
}
.brute {
  list-style: none;
  margin: 12px 0 0;
  padding: 10px;
  max-height: 160px;
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: 10px;
  font-size: 12.5px;
  color: var(--muted);
  columns: 2;
}
.brute li span {
  color: var(--faint);
  margin-right: 8px;
}
.brute li.cur {
  color: var(--yellow);
}
.brute li.hit {
  color: var(--acid);
}
.table {
  margin-top: 16px;
  display: grid;
  gap: 2px;
  font-size: 11.5px;
  overflow-x: auto;
}
.table__row {
  display: grid;
  grid-template-columns: repeat(26, minmax(14px, 1fr));
  text-align: center;
  color: var(--muted);
}
.table__row--c {
  color: var(--acid);
  opacity: 0.8;
}
.table__row span.cur {
  color: #050705;
  background: var(--yellow);
  border-radius: 3px;
}
</style>
