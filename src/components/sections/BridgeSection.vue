<script setup>
import { computed, ref, watch } from 'vue';
import SpecimenFrame from '../timeline/SpecimenFrame.vue';
import ThreeCanvas from '../three/ThreeCanvas.vue';
import { sha256Hex } from '../../crypto/password.js';
import { scrollToTarget } from '../../lib/scroll.js';

const input = ref('hunter2');
const hash = ref('');
const prev = ref('');
watch(
  input,
  async (v) => {
    const h = await sha256Hex(v);
    prev.value = hash.value;
    hash.value = h;
  },
  { immediate: true },
);
const changed = computed(() => {
  if (!prev.value) return 0;
  let n = 0;
  for (let i = 0; i < 64; i++) if (prev.value[i] !== hash.value[i]) n++;
  return n;
});
const params = computed(() => ({ input: input.value, hash: hash.value }));
</script>

<template>
  <section id="hashing" class="section bridge">
    <div class="container">
      <div class="bridge__grid">
        <div class="bridge__text">
          <p class="label" v-reveal>Part two · From ciphers to passwords</p>
          <h2 class="section-title" v-reveal="0.05">Your password is <em>a key, too</em></h2>
          <p class="lead" v-reveal="0.1">
            A good website never stores your password. It stores a <b class="acid">hash</b>: a fingerprint produced by a
            one-way function. Think of a meat grinder: easy to turn steak into mince, impossible to turn it back.
          </p>
          <ul class="props" v-reveal="0.12">
            <li><span class="n">01</span><span><b>Same input, same hash.</b> Log in, and the site hashes what you typed and compares fingerprints.</span></li>
            <li><span class="n">02</span><span><b>One character changes everything.</b> Edit the text and watch the whole hash flip.</span></li>
            <li><span class="n">03</span><span><b>No way back.</b> There is no “un-hash”. The only way in is to guess.</span></li>
          </ul>
          <div class="flow panel" v-reveal="0.14">
            <p class="label label--muted">So how do passwords get cracked?</p>
            <ol>
              <li>A site is breached and attackers walk away with millions of hashes.</li>
              <li>They guess a password, hash it, and compare. Match? Cracked.</li>
              <li>Repeat billions of times per second, just like trying every Caesar shift.</li>
            </ol>
            <p class="salt">
              Careful sites add a random <b>salt</b> to each password before hashing and use deliberately slow hash functions,
              so every single guess costs the attacker real time.
            </p>
            <a href="#lab" class="btn btn--primary btn--sm" @click.prevent="scrollToTarget('#lab')">See it happen to a password <span class="arrow">→</span></a>
          </div>
        </div>

        <div class="bridge__scene" v-reveal="0.08">
          <SpecimenFrame fig="H" title="SHA-256 · one-way function" :status="`${changed || 0}/64 changed`" hint="">
            <template #scene>
              <ThreeCanvas
                :load="() => import('../../three/models/hashmachine.js')"
                :params="params"
                label="A grinder-like machine swallows your letters and outputs a ring of 64 hexadecimal characters, the SHA-256 hash."
              />
            </template>
            <template #controls>
              <label class="field">
                <span class="field__label">Type anything</span>
                <input v-model="input" class="input" maxlength="40" spellcheck="false" autocomplete="off" />
              </label>
              <dl class="readout">
                <div>
                  <dt>SHA-256</dt>
                  <dd class="hash">
                    <span v-for="(ch, i) in hash" :key="i" :class="{ hot: prev && prev[i] !== ch }">{{ ch }}</span>
                  </dd>
                </div>
              </dl>
            </template>
          </SpecimenFrame>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.bridge {
  padding: clamp(80px, 14vh, 160px) 0;
}
.bridge__grid {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
  gap: clamp(32px, 4vw, 72px);
  align-items: center;
}
.bridge__text {
  display: grid;
  gap: 22px;
}
.props {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 12px;
}
.props li {
  display: grid;
  grid-template-columns: 34px 1fr;
  font-size: 15.5px;
  line-height: 1.55;
  color: var(--text-2);
}
.props b {
  color: var(--text);
  font-weight: 600;
}
.props .n {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--acid);
  padding-top: 3px;
}
.flow {
  padding: 18px 20px;
  display: grid;
  gap: 12px;
  justify-items: start;
}
.flow ol {
  margin: 0;
  padding-left: 20px;
  display: grid;
  gap: 6px;
  font-size: 15px;
  color: var(--text-2);
}
.salt {
  font-size: 13.5px;
  color: var(--muted);
}
.salt b {
  color: var(--yellow);
}
.hash {
  font-size: 12.5px !important;
  letter-spacing: 0.04em !important;
  color: var(--acid) !important;
}
.hash .hot {
  color: var(--yellow);
}
.readout {
  margin-top: 14px;
}
@media (max-width: 1080px) {
  .bridge__grid {
    grid-template-columns: 1fr;
  }
}
</style>
