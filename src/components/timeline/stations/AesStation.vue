<script setup>
import { computed, onBeforeUnmount, reactive } from 'vue';
import StationShell from '../StationShell.vue';
import SpecimenFrame from '../SpecimenFrame.vue';
import ThreeCanvas from '../../three/ThreeCanvas.vue';
import { encryptBlockTrace, textToBlock, toHex, bitDiff } from '../../../crypto/aes.js';

defineProps({ station: Object, reverse: Boolean });

const OPS = {
  input: { name: 'Your block', text: 'Your 16 characters, as 16 bytes in a 4 × 4 grid, written column by column.' },
  subBytes: { name: 'SubBytes', text: 'Every byte is swapped for another using a fixed table, the S-box. This is the non-linear “confusion” step.' },
  shiftRows: { name: 'ShiftRows', text: 'Row 0 stays put; rows 1, 2 and 3 slide 1, 2 and 3 places to the left.' },
  mixColumns: { name: 'MixColumns', text: 'Each column is stirred so every byte depends on all four. This “diffusion” spreads any change.' },
  addRoundKey: { name: 'AddRoundKey', text: 'Each byte is XOR-ed with this round’s key, which is derived from your secret key.' },
};

const s = reactive({ text: 'ATTACK AT DAWN!!', key: 'MY-SECRET-KEY-42', index: 0, playing: false, avalanche: null });
const trace = computed(() => encryptBlockTrace(textToBlock(s.text), textToBlock(s.key)));
const steps = computed(() => trace.value.steps.map((x) => ({ op: x.op, round: x.round, state: Array.from(x.state), key: x.key ? Array.from(x.key) : null })));
const cur = computed(() => steps.value[Math.min(s.index, steps.value.length - 1)]);
const params = computed(() => ({ steps: steps.value, index: s.index }));
const output = computed(() => toHex(trace.value.output));
const done = computed(() => s.index >= steps.value.length - 1);
const status = computed(() => (cur.value.op === 'input' ? 'Plaintext' : `Round ${cur.value.round}/10`));
const rounds = Array.from({ length: 11 }, (_, i) => i);
let timer = null;

// Same durations as the 3D animation, so playback never waits on the renderer.
const DUR = { addRoundKey: 1.5, subBytes: 1.35, shiftRows: 1.35, mixColumns: 1.5, input: 0.6 };
function schedule() {
  clearTimeout(timer);
  if (!s.playing) return;
  if (done.value) {
    s.playing = false;
    return;
  }
  const op = steps.value[s.index]?.op; // the step currently animating
  timer = setTimeout(() => {
    if (!s.playing) return;
    next();
    schedule();
  }, (DUR[op] || 1.3) * 1000 + 260);
}
function next() {
  if (s.index < steps.value.length - 1) s.index++;
}
function prev() {
  s.playing = false;
  clearTimeout(timer);
  if (s.index > 0) s.index = Math.max(0, s.index - 1);
}
function play() {
  if (done.value) s.index = 0;
  s.playing = !s.playing;
  if (s.playing) {
    next();
    schedule();
  } else clearTimeout(timer);
}
function reset() {
  s.playing = false;
  clearTimeout(timer);
  s.index = 0;
  s.avalanche = null;
}
function onEvent() {}
function avalanche() {
  const t = s.text.padEnd(16, ' ').slice(0, 16);
  const last = t.charCodeAt(15);
  const flipped = t.slice(0, 15) + String.fromCharCode(last ^ 1);
  const a = trace.value.output;
  const b = encryptBlockTrace(textToBlock(flipped), textToBlock(s.key)).output;
  s.avalanche = { flipped, hex: toHex(b), bits: bitDiff(a, b), original: toHex(a) };
}
const roundState = (r) => {
  const i = s.index;
  const first = steps.value.findIndex((x) => x.round === r);
  const lastIdx = steps.value.findLastIndex((x) => x.round === r);
  if (i > lastIdx) return 'done';
  if (i >= first) return 'cur';
  return '';
};
onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <StationShell :station="station" :reverse="reverse">
    <SpecimenFrame fig="06" title="AES-128 · state matrix" :status="status" hint="">
      <template #scene>
        <ThreeCanvas
          :load="() => import('../../../three/models/aes.js')"
          :params="params"
          label="Sixteen cubes in a 4 by 4 grid, each showing one byte of the AES state as it is substituted, shifted, mixed and keyed."
          @event="onEvent"
        />
      </template>
      <template #overlay>
        <div class="op" aria-live="polite">
          <span class="op__name">{{ OPS[cur.op].name }}</span>
          <span class="op__text">{{ OPS[cur.op].text }}</span>
        </div>
      </template>
      <template #controls>
        <div class="row2">
          <label class="field">
            <span class="field__label">Message · 16 chars</span>
            <input v-model="s.text" class="input" maxlength="16" spellcheck="false" autocomplete="off" @input="reset" />
          </label>
          <label class="field">
            <span class="field__label">Secret key · 16 chars</span>
            <input v-model="s.key" class="input" maxlength="16" spellcheck="false" autocomplete="off" @input="reset" />
          </label>
        </div>
        <div class="player">
          <button type="button" class="btn btn--ghost btn--sm" :disabled="s.index === 0" @click="prev">◀</button>
          <button type="button" class="btn btn--primary btn--sm" @click="play">{{ s.playing ? 'Pause' : done ? 'Replay' : 'Play all rounds' }}</button>
          <button type="button" class="btn btn--ghost btn--sm" :disabled="done || s.playing" @click="next">Next step ▶</button>
          <ol class="rounds" aria-label="Rounds">
            <li v-for="r in rounds" :key="r" :class="roundState(r)">{{ r }}</li>
          </ol>
        </div>
        <dl class="readout">
          <div>
            <dt>Ciphertext</dt>
            <dd :class="{ dim: !done }" class="hexout">{{ done ? output : '··· finish all 10 rounds ···' }}</dd>
          </div>
          <div v-if="s.avalanche">
            <dt>1 bit changed</dt>
            <dd class="hexout">
              <span v-for="(ch, i) in s.avalanche.hex" :key="i" :class="{ diff: ch !== s.avalanche.original[i] }">{{ ch }}</span>
            </dd>
          </div>
        </dl>
        <div class="aval">
          <button type="button" class="btn btn--ghost btn--sm" @click="avalanche">Avalanche test</button>
          <p v-if="s.avalanche">
            Flipping a single bit of the last character changed <b class="yellow">{{ s.avalanche.bits }}</b> of 128 output bits. Nothing
            about the input survives in a recognisable form.
          </p>
          <p v-else>Change one bit of the input and see how much of the output changes.</p>
        </div>
      </template>
    </SpecimenFrame>
  </StationShell>
</template>

<style scoped>
.row2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 14px;
}
.player {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.rounds {
  display: flex;
  gap: 3px;
  margin: 0 0 0 auto;
  padding: 0;
  list-style: none;
}
.rounds li {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 5px;
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--muted);
  border: 1px solid var(--line);
}
.rounds li.done {
  background: rgba(182, 255, 0, 0.16);
  color: var(--acid);
}
.rounds li.cur {
  background: var(--acid);
  color: #050705;
}
.hexout {
  font-size: 13.5px !important;
  letter-spacing: 0.06em !important;
  color: var(--acid) !important;
}
.hexout.dim {
  color: var(--muted) !important;
}
.hexout .diff {
  color: var(--yellow);
}
.aval {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-top: 12px;
}
.aval p {
  font-size: 13.5px;
  color: var(--text-2);
}
.op {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 14px;
  z-index: 2;
  display: grid;
  gap: 2px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--line-2);
  background: rgba(3, 6, 3, 0.8);
  backdrop-filter: blur(6px);
}
.op__name {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--acid);
}
.op__text {
  font-size: 13.5px;
  color: var(--text-2);
}
</style>
