<script setup>
import { computed, reactive } from 'vue';
import StationShell from '../StationShell.vue';
import SpecimenFrame from '../SpecimenFrame.vue';
import ThreeCanvas from '../../three/ThreeCanvas.vue';

defineProps({ station: Object, reverse: Boolean });

const CAPTIONS = {
  rsa: 'Today’s internet locks: RSA and elliptic curves, safe against every ordinary computer.',
  attack: 'A large quantum computer runs Shor’s algorithm. The qubits interfere to reveal the two hidden primes, and the lock falls apart.',
  broken: 'Broken. Everything ever locked with this key can now be read, including traffic recorded years ago.',
  pq: 'The post-quantum lock is built on lattices: finding the shortest path through a huge, skewed grid.',
  held: 'The beams bounce off. No quantum shortcut is known for lattice problems.',
};

const s = reactive({ mode: 'rsa', runId: 0, caption: 'rsa' });
const params = computed(() => ({ mode: s.mode, runId: s.runId }));
const status = computed(() => ({ rsa: 'RSA-2048', attack: 'Under attack', broken: 'Broken', pq: 'Post-quantum', held: 'Holding' })[s.caption]);
const tone = computed(() => (['attack', 'broken'].includes(s.caption) ? 'danger' : s.caption === 'held' || s.caption === 'pq' ? 'acid' : 'yellow'));

function run(mode) {
  s.mode = mode;
  s.caption = mode;
  s.runId++;
}
function onEvent(name) {
  if (name === 'broken') s.caption = 'broken';
  if (name === 'held') s.caption = 'held';
}
</script>

<template>
  <StationShell :station="station" :reverse="reverse">
    <SpecimenFrame fig="08" title="Qubits vs locks" :status="status" :status-tone="tone" hint="">
      <template #scene>
        <ThreeCanvas
          :load="() => import('../../../three/models/quantum.js')"
          :params="params"
          label="Five qubits orbit a padlock made of cubes; when they attack, the RSA padlock shatters, while a lattice-shaped padlock withstands them."
          @event="onEvent"
        />
      </template>
      <template #overlay>
        <p class="caption" aria-live="polite">{{ CAPTIONS[s.caption] }}</p>
      </template>
      <template #controls>
        <div class="steps">
          <button type="button" class="btn btn--danger btn--sm" @click="run('attack')">1 · Run Shor’s algorithm</button>
          <button type="button" class="btn btn--primary btn--sm" @click="run('pq')">2 · Install a post-quantum lock</button>
          <button type="button" class="btn btn--ghost btn--sm" @click="run('rsa')">Reset</button>
        </div>
        <dl class="readout facts">
          <div>
            <dt>Shor (1994)</dt>
            <dd>Factors big numbers fast on a quantum computer: breaks RSA &amp; elliptic curves.</dd>
          </div>
          <div>
            <dt>Grover (1996)</dt>
            <dd>Speeds up guessing keys, but only halves the strength: AES-256 stays safe.</dd>
          </div>
          <div>
            <dt>How far off?</dt>
            <dd>Breaking RSA-2048 is estimated to need around a million noisy qubits (Gidney, 2025). Today’s machines are far smaller.</dd>
          </div>
        </dl>
      </template>
    </SpecimenFrame>
  </StationShell>
</template>

<style scoped>
.steps {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.facts dd {
  font-family: var(--font-body) !important;
  font-size: 14px !important;
  letter-spacing: 0 !important;
  color: var(--text-2) !important;
  word-break: normal !important;
}
.caption {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 14px;
  z-index: 2;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--line-2);
  background: rgba(3, 6, 3, 0.8);
  backdrop-filter: blur(6px);
  font-size: 14px;
  color: var(--text);
}
</style>
