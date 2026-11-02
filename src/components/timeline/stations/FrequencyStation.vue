<script setup>
import { computed, reactive, watch } from 'vue';
import StationShell from '../StationShell.vue';
import SpecimenFrame from '../SpecimenFrame.vue';
import ThreeCanvas from '../../three/ThreeCanvas.vue';
import { caesar, crackCaesar, uncaesar, ALPHABET } from '../../../crypto/classical.js';

defineProps({ station: Object, reverse: Boolean });

const PLAIN =
  'EVERY LANGUAGE LEAVES A FINGERPRINT. IN ENGLISH THE LETTER E TURNS UP FAR MORE OFTEN THAN ANY OTHER LETTER, FOLLOWED BY T, A AND O. COUNT THE SYMBOLS IN A SECRET MESSAGE, FIND THE TALLEST BAR, AND YOU HAVE PROBABLY FOUND THE LETTER E. THE REST OF THE KEY FALLS OUT ON ITS OWN.';

const s = reactive({ key: 7, text: caesar(PLAIN, 7), crack: false, scanning: false, scanAt: 0, done: false, best: null });

const result = computed(() => crackCaesar(s.text));
const scores = computed(() => result.value.scores);
const maxScore = computed(() => Math.max(...scores.value.filter(Number.isFinite)));
const params = computed(() => ({ text: s.text, crack: s.crack, shift: 0 }));
const status = computed(() => (s.scanning ? `Testing shift ${s.scanAt}` : s.done ? `Key = ${s.best}` : 'Unknown key'));
const tone = computed(() => (s.scanning ? 'yellow' : s.done ? 'acid' : 'danger'));
const decrypted = computed(() => (s.done ? uncaesar(s.text, s.best) : ''));
const eHiding = computed(() => (s.best == null ? '' : ALPHABET[(4 + s.best) % 26]));

watch(
  () => s.text,
  () => {
    if (s.scanning) return;
    s.done = false;
    s.best = null;
    s.crack = false;
  },
);

function crack() {
  s.done = false;
  s.best = null;
  s.crack = false;
  requestAnimationFrame(() => {
    s.crack = true;
    s.scanning = true;
  });
}
function newSecret() {
  let k = s.key;
  while (k === s.key) k = 1 + Math.floor(Math.random() * 25);
  s.key = k;
  s.text = caesar(PLAIN, k);
  s.crack = false;
  s.scanning = false;
  s.done = false;
  s.best = null;
}
function onEvent(name, v) {
  if (name === 'scan') s.scanAt = v.shift;
  if (name === 'done') {
    s.scanning = false;
    s.done = true;
    s.best = v;
  }
}
</script>

<template>
  <StationShell :station="station" :reverse="reverse">
    <SpecimenFrame fig="03" title="Letter frequencies · yours vs English" :status="status" :status-tone="tone" hint="" height="clamp(320px, 31vw, 440px)">
      <template #scene>
        <ThreeCanvas
          :load="() => import('../../../three/models/frequency.js')"
          :params="params"
          label="Bar chart in 3D: solid bars show letter counts in the secret message; wireframe bars show normal English letter frequencies."
          @event="onEvent"
        />
      </template>
      <template #overlay>
        <div class="legend" aria-hidden="true">
          <span><i class="sw sw--solid"></i>Secret message</span>
          <span><i class="sw sw--wire"></i>Normal English</span>
        </div>
      </template>
      <template #controls>
        <label class="field">
          <span class="field__label">Intercepted message (Caesar, key unknown)</span>
          <textarea v-model="s.text" class="input area" rows="3" spellcheck="false"></textarea>
        </label>
        <div class="ctl-row">
          <button type="button" class="btn btn--primary btn--sm" :disabled="s.scanning" @click="crack">
            {{ s.scanning ? 'Analysing…' : 'Crack it with frequencies' }}
          </button>
          <button type="button" class="btn btn--ghost btn--sm" :disabled="s.scanning" @click="newSecret">New secret</button>
          <div class="spark" aria-label="How un-English each shift looks; the lowest bar is the best fit">
            <span class="field__label">Fit per shift</span>
            <svg viewBox="0 0 260 40" preserveAspectRatio="none">
              <rect
                v-for="(v, k) in scores"
                :key="k"
                :x="k * 10 + 1"
                :width="8"
                :y="40 - Math.max(2, (v / maxScore) * 38)"
                :height="Math.max(2, (v / maxScore) * 38)"
                :class="{ cur: s.scanning && k === s.scanAt, best: s.done && k === s.best }"
              />
            </svg>
          </div>
        </div>
        <dl class="readout">
          <div v-if="s.done">
            <dt>Found</dt>
            <dd>The tallest bar is <b class="yellow">{{ eHiding }}</b>, so E was shifted by <b class="acid">{{ s.best }}</b>.</dd>
          </div>
          <div v-if="s.done">
            <dt>Decrypted</dt>
            <dd class="dec">{{ decrypted }}</dd>
          </div>
          <div v-if="!s.done">
            <dt>Step</dt>
            <dd class="hint">Slide the solid bars along until their peaks fit the English outlines. No key needed.</dd>
          </div>
        </dl>
      </template>
    </SpecimenFrame>
  </StationShell>
</template>

<style scoped>
.area {
  height: auto;
  padding: 12px 14px;
  resize: vertical;
  line-height: 1.5;
  font-size: 13px;
  letter-spacing: 0.08em;
  color: var(--danger);
}
.ctl-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  margin: 14px 0;
}
.spark {
  margin-left: auto;
  display: grid;
  gap: 6px;
  width: 220px;
}
.spark svg {
  width: 100%;
  height: 38px;
}
.spark rect {
  fill: #2a3a22;
  transition: fill 0.2s;
}
.spark rect.cur {
  fill: var(--yellow);
}
.spark rect.best {
  fill: var(--acid);
}
.readout dd {
  letter-spacing: 0.04em !important;
  font-size: 14px !important;
  word-break: normal !important;
}
.dec {
  color: var(--acid) !important;
  font-size: 12.5px !important;
  line-height: 1.5;
}
.hint {
  color: var(--text-2) !important;
  font-family: var(--font-body) !important;
}
.legend {
  position: absolute;
  left: 18px;
  bottom: 14px;
  z-index: 2;
  display: flex;
  gap: 16px;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-2);
}
.sw {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 7px;
  vertical-align: -1px;
}
.sw--solid {
  background: var(--acid);
}
.sw--wire {
  border: 1px solid var(--yellow);
}
</style>
