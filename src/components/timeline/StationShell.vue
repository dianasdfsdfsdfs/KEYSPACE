<script setup>
defineProps({
  station: { type: Object, required: true },
  reverse: { type: Boolean, default: false },
});
</script>

<template>
  <article :id="`st-${station.id}`" class="station" :class="{ 'station--reverse': reverse }" :data-station="station.id">
    <div class="station__text">
      <header class="station__head" v-reveal>
        <p class="station__meta">
          <span class="station__num">{{ station.num }}</span>
          <span>{{ station.era }}</span>
          <span class="station__dot">·</span>
          <span>{{ station.date }}</span>
        </p>
        <h3 class="station__title">{{ station.title }}</h3>
        <p class="station__kind">{{ station.kind }}</p>
      </header>

      <p class="station__lead" v-reveal="0.05">{{ station.lead }}</p>

      <ol class="station__how" v-reveal="0.1">
        <li v-for="(step, i) in station.how" :key="i">
          <span class="station__step">0{{ i + 1 }}</span>
          <span>{{ step }}</span>
        </li>
      </ol>

      <dl class="station__facts" v-reveal="0.12">
        <div v-for="f in station.facts" :key="f.k">
          <dt>{{ f.k }}</dt>
          <dd>{{ f.v }}</dd>
        </div>
      </dl>

      <div class="station__broken" v-reveal="0.14">
        <p class="station__broken-tag"><span class="x">✕</span> How it was broken</p>
        <p>{{ station.broken }}</p>
      </div>

      <slot name="extra" />

      <p class="station__note" v-reveal="0.16">{{ station.note }}</p>
    </div>

    <div class="station__scene" v-reveal="0.08">
      <slot />
    </div>
  </article>
</template>

<style scoped>
.station {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: clamp(32px, 4vw, 72px);
  align-items: center;
  padding: clamp(72px, 11vh, 140px) 0;
}
.station--reverse {
  grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
}
.station--reverse .station__text {
  order: 2;
}
.station--reverse .station__scene {
  order: 1;
}
.station__text {
  position: relative;
  padding: 8px 0;
}
.station__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 14px;
}
.station__num {
  display: inline-grid;
  place-items: center;
  height: 24px;
  padding: 0 8px;
  border-radius: 6px;
  background: var(--acid);
  color: #050705;
  font-weight: 700;
}
.station__dot {
  color: var(--faint);
}
.station__title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(32px, 3.4vw, 52px);
  line-height: 1.02;
  letter-spacing: -0.025em;
  margin-bottom: 8px;
}
.station__kind {
  font-family: var(--font-mono);
  font-size: 12.5px;
  letter-spacing: 0.08em;
  color: var(--acid);
  margin-bottom: 22px;
}
.station__lead {
  font-size: 17.5px;
  line-height: 1.62;
  color: var(--text);
  margin-bottom: 24px;
}
.station__how {
  list-style: none;
  padding: 0;
  margin: 0 0 24px;
  display: grid;
  gap: 10px;
}
.station__how li {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 8px;
  font-size: 15.5px;
  line-height: 1.55;
  color: var(--text-2);
}
.station__step {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--acid);
  padding-top: 3px;
}
.station__facts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  margin: 0 0 22px;
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  background: var(--line);
}
.station__facts > div {
  padding: 12px 14px;
  background: rgba(6, 10, 6, 0.92);
}
.station__facts dt {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 4px;
}
.station__facts dd {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 13.5px;
  color: var(--text);
}
.station__broken {
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(var(--danger-rgb), 0.28);
  background: rgba(var(--danger-rgb), 0.05);
  font-size: 15px;
  line-height: 1.55;
  color: var(--text-2);
  margin-bottom: 18px;
}
.station__broken-tag {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--danger);
  margin-bottom: 6px;
}
.station__broken-tag .x {
  margin-right: 6px;
}
.station__note {
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--muted);
  padding-left: 14px;
  border-left: 2px solid var(--line-2);
}
.station__scene {
  min-width: 0;
}

@media (max-width: 1080px) {
  .station,
  .station--reverse {
    grid-template-columns: 1fr;
  }
  .station--reverse .station__text,
  .station--reverse .station__scene {
    order: initial;
  }
}
</style>
