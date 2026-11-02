<script setup>
import ThreeCanvas from '../three/ThreeCanvas.vue';

const TERMS = [
  { k: 'Plaintext', d: 'The message you want to keep secret, exactly as written.', c: 'text' },
  { k: 'Key + algorithm', d: 'The algorithm is the recipe for scrambling; the key is the secret setting. The recipe can be public; the key must not be.', c: 'acid' },
  { k: 'Ciphertext', d: 'The scrambled result. Useless to anyone without the key, readable again for anyone with it.', c: 'yellow' },
];
</script>

<template>
  <section id="intro" class="section intro">
    <div class="container">
      <header class="intro__head">
        <p class="label" v-reveal>Before we start · 30-second primer</p>
        <h2 class="section-title" v-reveal="0.05">What is a <em>cipher</em>?</h2>
        <p class="lead" v-reveal="0.1">
          A cipher is a method for scrambling a message so only the right person can unscramble it. Every machine on this
          page, from a wooden stick to a quantum computer, plays with the same three ingredients.
        </p>
      </header>
      <figure class="intro__stage brackets" v-reveal="0.12">
        <ThreeCanvas :load="() => import('../../three/models/cipherbox.js')" label="Letter tiles slide into a locked box and come out scrambled." />
      </figure>
      <ol class="terms">
        <li v-for="(t, i) in TERMS" :key="t.k" v-reveal="0.08 * i">
          <span class="terms__n mono">0{{ i + 1 }}</span>
          <h3 :class="t.c">{{ t.k }}</h3>
          <p>{{ t.d }}</p>
        </li>
      </ol>
      <p class="kerckhoffs" v-reveal>
        <span class="label label--muted">Kerckhoffs’s principle, 1883</span>
        A cipher should stay safe even if the enemy knows exactly how it works. Only the key is secret. Keep that in mind
        for every station below.
      </p>
    </div>
  </section>
</template>

<style scoped>
.intro {
  padding: clamp(80px, 12vh, 140px) 0 clamp(40px, 6vh, 80px);
}
.intro__head {
  max-width: 820px;
  display: grid;
  gap: 18px;
  margin-bottom: 36px;
}
.intro__stage {
  position: relative;
  height: clamp(260px, 26vw, 360px);
  margin: 0 0 28px;
  border: 1px solid var(--line-2);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: #060906;
}
.terms {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.terms li {
  padding: 18px 20px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--panel);
  backdrop-filter: blur(8px);
}
.terms__n {
  font-size: 12px;
  color: var(--muted);
}
.terms h3 {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
  margin: 6px 0 8px;
}
.terms h3.text {
  color: var(--text);
}
.terms h3.acid {
  color: var(--acid);
}
.terms h3.yellow {
  color: var(--yellow);
}
.terms p {
  font-size: 15px;
  color: var(--text-2);
}
.kerckhoffs {
  margin-top: 24px;
  display: grid;
  gap: 6px;
  max-width: 760px;
  font-size: 15.5px;
  color: var(--text-2);
}
@media (max-width: 860px) {
  .terms {
    grid-template-columns: 1fr;
  }
}
</style>
