<script setup>
import ThreeCanvas from '../three/ThreeCanvas.vue';

const CARDS = [
  { t: 'Use a password manager', d: 'It remembers a different long, random password for every site, so you only remember one strong master passphrase.' },
  { t: 'Turn on two-factor', d: 'A code from your phone or a security key means a stolen password alone is not enough to get in.' },
  { t: 'Never reuse passwords', d: 'When one site leaks, attackers try the same email and password everywhere else. Unique passwords stop the domino effect.' },
  { t: 'Prefer long passphrases', d: 'Four or five random words beat short “complex” passwords. Length grows the keyspace much faster than symbols.' },
  { t: 'Keep things updated', d: 'Updates patch the holes attackers use to skip the lock entirely. Turn on automatic updates.' },
];
</script>

<template>
  <section id="defend" class="section defend">
    <div class="container">
      <header class="defend__head">
        <p class="label" v-reveal>Part four · Defend yourself</p>
        <h2 class="section-title" v-reveal="0.05">Five habits that <em>beat the crackers</em></h2>
        <p class="lead" v-reveal="0.1">You have seen how locks get picked. These are the habits that make you the hard target.</p>
      </header>
      <div class="icons" aria-hidden="true">
        <ThreeCanvas :load="() => import('../../three/models/defense.js')" :stage="{ dprMax: 1.75 }" label="Icons: a vault, a phone with a code, a key ring, dice and a shield." />
      </div>
      <ol class="cards">
        <li v-for="(c, i) in CARDS" :key="c.t" class="panel" v-reveal="0.06 * i">
          <span class="mono n">0{{ i + 1 }}</span>
          <h3>{{ c.t }}</h3>
          <p>{{ c.d }}</p>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.defend {
  padding: clamp(80px, 12vh, 140px) 0 clamp(60px, 10vh, 120px);
}
.defend__head {
  max-width: 820px;
  display: grid;
  gap: 18px;
  margin-bottom: 20px;
}
.icons {
  position: relative;
  height: clamp(180px, 16vw, 230px);
  margin-bottom: 4px;
}
.icons :deep(.three-canvas) {
  border-radius: var(--radius-lg);
}
.cards {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}
.cards li {
  padding: 18px;
}
.n {
  font-size: 12px;
  color: var(--acid);
}
.cards h3 {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 600;
  line-height: 1.25;
  margin: 8px 0;
}
.cards p {
  font-size: 14px;
  color: var(--text-2);
}
@media (max-width: 1080px) {
  .cards {
    grid-template-columns: 1fr 1fr;
  }
  .icons {
    display: none;
  }
}
@media (max-width: 640px) {
  .cards {
    grid-template-columns: 1fr;
  }
}
</style>
