<script setup>
defineProps({
  fig: { type: String, default: '' },
  title: { type: String, default: '' },
  status: { type: String, default: '' },
  statusTone: { type: String, default: 'acid' }, // acid | yellow | danger
  hint: { type: String, default: 'Drag to rotate' },
  height: { type: String, default: 'clamp(380px, 46vw, 560px)' },
});
</script>

<template>
  <figure class="specimen brackets">
    <div class="specimen__stage" :style="{ height }">
      <slot name="scene" />
      <div class="specimen__hud" aria-hidden="true">
        <span class="specimen__fig">FIG. {{ fig }}</span>
        <span class="specimen__title">{{ title }}</span>
        <span class="specimen__status" :class="`tone-${statusTone}`"><i></i>{{ status }}</span>
      </div>
      <div class="specimen__grid" aria-hidden="true"></div>
      <span v-if="hint" class="specimen__hint" aria-hidden="true">{{ hint }}</span>
      <slot name="overlay" />
    </div>
    <figcaption v-if="$slots.controls" class="specimen__controls">
      <slot name="controls" />
    </figcaption>
  </figure>
</template>

<style scoped>
.specimen {
  margin: 0;
  border: 1px solid var(--line-2);
  border-radius: var(--radius-lg);
  background: var(--panel-solid);
  overflow: visible;
  box-shadow:
    0 30px 80px -40px rgba(0, 0, 0, 0.9),
    0 0 0 1px rgba(0, 0, 0, 0.6) inset;
}
.specimen__stage {
  position: relative;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  overflow: hidden;
  background: radial-gradient(120% 90% at 50% 40%, #0b1209, #050805 70%);
}
.specimen__stage:only-child {
  border-radius: var(--radius-lg);
}
.specimen__hud {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  pointer-events: none;
  z-index: 2;
  background: linear-gradient(180deg, rgba(3, 5, 3, 0.7), transparent);
}
.specimen__fig {
  color: var(--acid);
}
.specimen__title {
  flex: 1;
  color: var(--text-2);
}
.specimen__status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.specimen__status i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}
.tone-acid {
  color: var(--acid);
}
.tone-yellow {
  color: var(--yellow);
}
.tone-danger {
  color: var(--danger);
}
.specimen__grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  background-image:
    linear-gradient(rgba(182, 255, 0, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(182, 255, 0, 0.035) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(80% 80% at 50% 50%, transparent 40%, #000 100%);
  -webkit-mask-image: radial-gradient(80% 80% at 50% 50%, transparent 40%, #000 100%);
}
.specimen__hint {
  position: absolute;
  right: 16px;
  bottom: 12px;
  z-index: 2;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--faint);
  pointer-events: none;
}
.specimen__controls {
  padding: 18px 20px 20px;
  border-top: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(10, 16, 9, 0.9), rgba(6, 9, 6, 0.95));
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}
</style>
