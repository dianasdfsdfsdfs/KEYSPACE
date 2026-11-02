<script setup>
import { computed, reactive, ref } from 'vue';
import StationShell from '../StationShell.vue';
import SpecimenFrame from '../SpecimenFrame.vue';
import ThreeCanvas from '../../three/ThreeCanvas.vue';
import { vigenere, cleanText } from '../../../crypto/classical.js';

defineProps({ station: Object, reverse: Boolean });

const s = reactive({ text: 'ATTACK AT DAWN', key: 'LEMON' });
const cursor = ref(0);
const res = computed(() => vigenere(cleanText(s.text, 28) || 'ATTACK AT DAWN', s.key));
const steps = computed(() => res.value.steps.filter((x) => x.keyChar));
const params = computed(() => ({ steps: steps.value.map((x) => ({ plain: x.plain, keyChar: x.keyChar, shift: x.shift, cipher: x.cipher })) }));
const cur = computed(() => steps.value[cursor.value] || steps.value[0]);
// The same plaintext letter turning into different ciphertext letters
const spread = computed(() => {
  const map = {};
  for (const x of steps.value) (map[x.plain] ||= new Set()).add(x.cipher);
  const best = Object.entries(map).sort((a, b) => b[1].size - a[1].size)[0];
  return best && best[1].size > 1 ? { letter: best[0], as: [...best[1]] } : null;
});
function onEvent(name, v) {
  if (name === 'cursor') cursor.value = v;
}
</script>

<template>
  <StationShell :station="station" :reverse="reverse">
    <SpecimenFrame fig="04" title="Tabula recta · 26 alphabets" :status="`Key ${res.key}`" hint="">
      <template #scene>
        <ThreeCanvas
          :load="() => import('../../../three/models/vigenere.js')"
          :params="params"
          label="The Vigenère square: a 26 by 26 grid of shifted alphabets; the key letter picks the row, the message letter picks the column."
          @event="onEvent"
        />
      </template>
      <template #overlay>
        <div v-if="cur" class="lookup" aria-hidden="true">
          row <b class="acid">{{ cur.keyChar }}</b> × column <b class="acid">{{ cur.plain }}</b> → <b class="yellow">{{ cur.cipher }}</b>
        </div>
      </template>
      <template #controls>
        <div class="row2">
          <label class="field">
            <span class="field__label">Your message</span>
            <input v-model="s.text" class="input" maxlength="28" spellcheck="false" autocomplete="off" />
          </label>
          <label class="field">
            <span class="field__label">Keyword</span>
            <input v-model="s.key" class="input" maxlength="12" spellcheck="false" autocomplete="off" />
          </label>
        </div>
        <div class="tape mono" role="table" aria-label="Plaintext, repeating key and ciphertext">
          <div class="tape__row" role="row">
            <span class="tape__h" role="rowheader">Plain</span>
            <span v-for="(x, i) in steps" :key="i" role="cell" :class="{ cur: i === cursor }">{{ x.plain }}</span>
          </div>
          <div class="tape__row tape__row--key" role="row">
            <span class="tape__h" role="rowheader">Key</span>
            <span v-for="(x, i) in steps" :key="i" role="cell" :class="{ cur: i === cursor, start: x.keyPos === 0 }">{{ x.keyChar }}</span>
          </div>
          <div class="tape__row tape__row--c" role="row">
            <span class="tape__h" role="rowheader">Cipher</span>
            <span v-for="(x, i) in steps" :key="i" role="cell" :class="{ cur: i === cursor }">{{ x.cipher }}</span>
          </div>
        </div>
        <p v-if="spread" class="note">
          Notice: <b class="acid">{{ spread.letter }}</b> was encrypted as
          <b class="yellow">{{ spread.as.join(', ') }}</b>. The fingerprint from station 03 is smeared out.
        </p>
      </template>
    </SpecimenFrame>
  </StationShell>
</template>

<style scoped>
.row2 {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
.tape {
  display: grid;
  gap: 4px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.tape__row {
  display: flex;
  gap: 3px;
  font-size: 14px;
}
.tape__row span {
  flex: 0 0 auto;
  width: 22px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 5px;
  color: var(--text-2);
  background: rgba(255, 255, 255, 0.02);
  transition:
    background 0.25s,
    color 0.25s;
}
.tape__row span.tape__h {
  width: 64px;
  justify-content: start;
  place-items: center start;
  background: none;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.tape__row--key span {
  color: var(--acid);
}
.tape__row--key span.start {
  box-shadow: inset 2px 0 0 var(--acid);
}
.tape__row--c span {
  color: var(--yellow);
}
.tape__row span.cur {
  background: var(--acid);
  color: #050705;
}
.tape__row--c span.cur {
  background: var(--yellow);
}
.note {
  margin-top: 12px;
  font-size: 14px;
  color: var(--text-2);
}
.lookup {
  position: absolute;
  left: 18px;
  bottom: 14px;
  z-index: 2;
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid var(--line-2);
  background: rgba(3, 6, 3, 0.75);
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--text-2);
}
</style>
