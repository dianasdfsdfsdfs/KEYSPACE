<script setup>
import { ref } from 'vue';
import DecryptText from '../ui/DecryptText.vue';
import { bus } from '../../lib/bus.js';
import { scrollToTarget } from '../../lib/scroll.js';

const unlocking = ref(false);
function hoverLab(v) {
  unlocking.value = v;
  bus.emit('hero:unlock', v);
}
</script>

<template>
  <section id="top" class="hero section">
    <div class="container hero__inner">
      <div class="hero__copy">
        <p class="hero__boot mono">
          <span class="acid">&gt;</span> keyspace://boot — 2,500 years of secrets loaded<span class="cursor">_</span>
        </p>
        <p class="label hero__eyebrow" v-reveal="0.1">An interactive history of codebreaking</p>
        <h1 class="hero__title display">
          <DecryptText text="Every secret" tag="span" class="line" :on-view="false" :delay="0.35" />
          <DecryptText text="is a lock." tag="span" class="line line--acid" :on-view="false" :delay="0.75" />
        </h1>
        <p class="hero__sub" v-reveal="0.5">Learn how locks are built, and how they get picked.</p>
        <p class="lead hero__lead" v-reveal="0.62">
          Travel 2,500 years from Caesar's cipher wheel to quantum computers. Then put your own password under attack and
          watch, step by step, how a cracker thinks.
        </p>
        <div class="hero__ctas" v-reveal="0.75">
          <a href="#history" class="btn btn--primary" @click.prevent="scrollToTarget('#history')">
            Start the journey <span class="arrow arrow--down">↓</span>
          </a>
          <a
            href="#lab"
            class="btn btn--ghost"
            @mouseenter="hoverLab(true)"
            @mouseleave="hoverLab(false)"
            @focus="hoverLab(true)"
            @blur="hoverLab(false)"
            @click.prevent="scrollToTarget('#lab')"
          >
            Test your password <span class="arrow">→</span>
          </a>
        </div>
        <dl class="hero__stats" v-reveal="0.9">
          <div>
            <dt>Ciphers to try</dt>
            <dd>08</dd>
          </div>
          <div>
            <dt>Years covered</dt>
            <dd>2,500</dd>
          </div>
          <div>
            <dt>Bytes sent to a server</dt>
            <dd class="acid">0</dd>
          </div>
        </dl>
      </div>

      <div class="hero__hud" aria-hidden="true">
        <div class="hud-tag">
          <span class="hud-tag__k">obj</span><span>padlock.bin</span>
        </div>
        <div class="hud-tag">
          <span class="hud-tag__k">material</span><span>binary glyphs</span>
        </div>
        <div class="hud-tag" :class="{ 'is-open': unlocking }">
          <span class="hud-tag__k">state</span><span>{{ unlocking ? 'unlocking…' : 'locked' }}</span>
        </div>
      </div>
    </div>

    <button class="scroll-cue" type="button" @click="scrollToTarget('#intro')">
      <span class="scroll-cue__line"></span>
      <span class="label label--muted">Scroll to descend</span>
    </button>
  </section>
</template>

<style scoped>
.hero {
  min-height: max(100vh, 760px);
  display: flex;
  align-items: center;
  padding-top: var(--header-h);
}
/* soft shadow behind the copy so the rain never fights the headline */
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(58% 72% at 24% 56%, rgba(3, 5, 3, 0.82), rgba(3, 5, 3, 0.4) 55%, transparent 78%);
}
.hero__inner {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
  align-items: center;
  min-height: calc(100vh - var(--header-h));
}
.hero__copy {
  position: relative;
  max-width: 720px;
  padding: 24px 0 72px;
}
.hero__boot {
  font-size: 12px;
  color: var(--muted);
  letter-spacing: 0.04em;
  margin-bottom: 28px;
}
.cursor {
  color: var(--acid);
  animation: blink 1s steps(1) infinite;
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}
.hero__eyebrow {
  margin-bottom: 20px;
}
.hero__title {
  font-size: clamp(46px, 6.2vw, 104px);
  line-height: 0.95;
  letter-spacing: -0.035em;
  margin-bottom: 24px;
}
.hero__title :deep(.line) {
  display: block;
}
.hero__title :deep(.line--acid) {
  color: var(--acid);
  text-shadow: 0 0 40px rgba(182, 255, 0, 0.35);
}
.hero__sub {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: clamp(18px, 1.7vw, 24px);
  line-height: 1.35;
  color: var(--text);
  margin-bottom: 18px;
}
.hero__lead {
  margin-bottom: 36px;
  max-width: 54ch;
}
.hero__ctas {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 44px;
}
.hero__stats {
  display: flex;
  gap: 40px;
  margin: 0;
  padding-top: 22px;
  border-top: 1px solid var(--line);
  max-width: 560px;
}
.hero__stats dt {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 6px;
}
.hero__stats dd {
  margin: 0;
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.hero__hud {
  align-self: end;
  justify-self: end;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 96px;
}
.hud-tag {
  display: flex;
  gap: 14px;
  justify-content: space-between;
  min-width: 230px;
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-left: 2px solid var(--acid);
  background: rgba(3, 6, 3, 0.55);
  backdrop-filter: blur(6px);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-2);
  transition:
    border-color 0.3s,
    color 0.3s;
}
.hud-tag__k {
  color: var(--muted);
}
.hud-tag.is-open {
  border-left-color: var(--yellow);
  color: var(--yellow);
}

.scroll-cue {
  position: absolute;
  left: var(--gutter);
  bottom: 28px;
  display: flex;
  align-items: center;
  gap: 14px;
  background: none;
  border: 0;
  padding: 0;
}
.scroll-cue__line {
  position: relative;
  width: 1px;
  height: 46px;
  background: var(--line-2);
  overflow: hidden;
}
.scroll-cue__line::after {
  content: '';
  position: absolute;
  left: 0;
  top: -40%;
  width: 1px;
  height: 40%;
  background: var(--acid);
  box-shadow: 0 0 8px var(--acid);
  animation: drip 1.8s var(--ease-in-out) infinite;
}
@keyframes drip {
  to {
    top: 100%;
  }
}

@media (max-width: 960px) {
  .hero__inner {
    grid-template-columns: 1fr;
  }
  .hero__copy {
    padding-top: 42vh;
  }
  .hero__hud {
    display: none;
  }
  .hero__stats {
    gap: 24px;
  }
  .hero__stats dd {
    font-size: 24px;
  }
}
</style>
