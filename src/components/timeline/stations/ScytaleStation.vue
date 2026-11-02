<script setup>
import { computed, reactive, ref } from 'vue';
import StationShell from '../StationShell.vue';
import SpecimenFrame from '../SpecimenFrame.vue';
import ThreeCanvas from '../../three/ThreeCanvas.vue';
import { scytale } from '../../../crypto/classical.js';

const props = defineProps({ station: Object, reverse: Boolean });

const s = reactive({ text: 'ATTACK AT DAWN', key: 3, rod: 3, unwound: false });
const row = ref(0);
const letters = computed(() => s.text.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 24) || 'ATTACKATDAWN');
const result = computed(() => scytale(letters.value, s.key));
const strip = computed(() => result.value.strip.slice(0, 24));
// What you read along the rod you're actually holding
const readings = computed(() => {
  const out = [];
  for (let r = 0; r < s.rod; r++) {
    let line = '';
    for (let i = r; i < strip.value.length; i += s.rod) line += strip.value[i];
    out.push(line);
  }
  return out;
});
const readable = computed(() => s.rod === s.key);
const status = computed(() => (s.unwound ? 'Unwound' : readable.value ? 'Readable' : 'Wrong rod'));
const tone = computed(() => (s.unwound ? 'yellow' : readable.value ? 'acid' : 'danger'));
const params = computed(() => ({ text: letters.value, key: s.key, rod: s.rod, unwound: s.unwound }));

function setKey(k) {
  s.key = k;
  s.rod = k;
}
function onEvent(name, payload) {
  if (name === 'row') row.value = payload;
}
</script>

<template>
  <StationShell :station="station" :reverse="reverse">
    <SpecimenFrame fig="01" title="Scytale · rod & strip" :status="status" :status-tone="tone">
      <template #scene>
        <ThreeCanvas
          :load="() => import('../../../three/models/scytale.js')"
          :params="params"
          label="A wooden rod with a leather strip wound around it; letters written along the rod."
          @event="onEvent"
        />
      </template>
      <template #controls>
        <div class="ctl-grid">
          <label class="field">
            <span class="field__label">Your message</span>
            <input v-model="s.text" class="input" maxlength="30" spellcheck="false" autocomplete="off" />
          </label>
          <div class="field">
            <span class="field__label">Key · rod thickness</span>
            <div class="seg">
              <button v-for="k in [3, 4, 5, 6]" :key="k" type="button" :class="{ on: s.key === k }" @click="setKey(k)">{{ k }}</button>
            </div>
          </div>
        </div>

        <div class="ctl-row">
          <button type="button" class="btn btn--primary btn--sm" @click="s.unwound = !s.unwound">
            {{ s.unwound ? 'Wind it back' : 'Unwind the strip' }}
          </button>
          <div class="breaker">
            <span class="field__label">Codebreaker · try a rod</span>
            <div class="seg seg--sm">
              <button
                v-for="k in [2, 3, 4, 5, 6, 7, 8]"
                :key="k"
                type="button"
                :class="{ on: s.rod === k, hit: k === s.key && s.rod === k }"
                @click="
                  s.rod = k;
                  s.unwound = false;
                "
              >
                {{ k }}
              </button>
            </div>
          </div>
        </div>

        <dl class="readout">
          <div>
            <dt>Strip</dt>
            <dd class="mono strip">
              <span v-for="(ch, i) in strip" :key="i">{{ ch }}</span>
            </dd>
          </div>
          <div>
            <dt>Along the rod</dt>
            <dd class="mono rows" :class="{ bad: !readable }">
              <span v-for="(r, i) in readings" :key="i" :class="{ cur: i === row % s.rod && !s.unwound }">{{ r }}</span>
            </dd>
          </div>
        </dl>
      </template>
    </SpecimenFrame>
  </StationShell>
</template>

<style scoped>
.ctl-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  margin-bottom: 14px;
}
.ctl-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.breaker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.seg button.hit {
  box-shadow: 0 0 16px rgba(182, 255, 0, 0.6);
}
.strip span {
  color: var(--yellow);
}
.rows {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  color: var(--text-2);
}
.rows span {
  padding: 1px 6px;
  border-radius: 6px;
  transition:
    background 0.3s,
    color 0.3s;
}
.rows span.cur {
  background: rgba(182, 255, 0, 0.12);
  color: var(--acid);
}
.rows.bad span.cur {
  background: rgba(255, 46, 99, 0.12);
  color: var(--danger);
}
</style>
