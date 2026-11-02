<script setup>
import { computed, reactive } from 'vue';
import StationShell from '../StationShell.vue';
import SpecimenFrame from '../SpecimenFrame.vue';
import ThreeCanvas from '../../three/ThreeCanvas.vue';
import { TOY, encrypt, decrypt, factor } from '../../../crypto/rsa.js';

defineProps({ station: Object, reverse: Boolean });

const PHASES = {
  offer: { n: 1, text: 'Bob sends out an open padlock: his public key. Anyone may see it, Eve included.' },
  lock: { n: 2, text: 'Alice puts her message in a box and snaps Bob’s padlock shut.' },
  send: { n: 3, text: 'The locked box crosses the internet. Eve scans it, but has no key.' },
  unlock: { n: 4, text: 'Only Bob’s private key, which never left his computer, opens the lock.' },
  read: { n: 5, text: 'Bob reads the message. No secret was ever shared in advance.' },
  idle: { n: 0, text: 'Press “Send securely” to watch the exchange.' },
};

const s = reactive({ message: 'HELLO BOB', runId: 0, phase: 'offer', factored: false });
const params = computed(() => ({ message: s.message || 'HI', runId: s.runId }));
const firstChar = computed(() => (s.message.trim()[0] || 'H').toUpperCase());
const m = computed(() => firstChar.value.charCodeAt(0));
const c = computed(() => encrypt(m.value));
const back = computed(() => decrypt(c.value));
const [p, q] = factor(TOY.n);
const phase = computed(() => PHASES[s.phase] || PHASES.idle);
const tone = computed(() => (s.phase === 'send' ? 'danger' : s.phase === 'read' ? 'acid' : 'yellow'));
const status = computed(() => (s.phase === 'send' ? 'Eve watching' : s.phase === 'read' ? 'Delivered' : 'Key exchange'));

function send() {
  s.runId++;
}
function onEvent(name, v) {
  if (name === 'phase') s.phase = v;
}
</script>

<template>
  <StationShell :station="station" :reverse="reverse">
    <SpecimenFrame fig="07" title="Public & private keys" :status="status" :status-tone="tone" hint="">
      <template #scene>
        <ThreeCanvas
          :load="() => import('../../../three/models/publickey.js')"
          :params="params"
          label="Alice and Bob exchange a padlocked box over a wire while an eavesdropper drone watches but cannot open it."
          @event="onEvent"
        />
      </template>
      <template #overlay>
        <div class="caption" aria-live="polite">
          <span class="caption__n">{{ String(phase.n).padStart(2, '0') }}</span>
          <span>{{ phase.text }}</span>
        </div>
      </template>
      <template #controls>
        <div class="row">
          <label class="field grow">
            <span class="field__label">Alice’s message</span>
            <input v-model="s.message" class="input" maxlength="18" spellcheck="false" autocomplete="off" />
          </label>
          <button type="button" class="btn btn--primary btn--sm" @click="send">Send securely</button>
        </div>
        <div class="math">
          <p class="label label--muted">The same idea with real (tiny) RSA numbers</p>
          <ol class="mono">
            <li><span class="k">Bob's public key</span> e = {{ TOY.e }}, n = {{ TOY.n }} <span class="k">· private</span> d = {{ TOY.d }}</li>
            <li>
              <span class="k">Lock</span> “{{ firstChar }}” = {{ m }} → {{ m }}<sup>{{ TOY.e }}</sup> mod {{ TOY.n }} =
              <b class="yellow">{{ c }}</b>
            </li>
            <li>
              <span class="k">Unlock</span> {{ c }}<sup>{{ TOY.d }}</sup> mod {{ TOY.n }} = <b class="acid">{{ back }}</b> → “{{ String.fromCharCode(Number(back)) }}”
            </li>
          </ol>
          <div class="factor">
            <button type="button" class="btn btn--ghost btn--sm" @click="s.factored = true">Break it: factor n</button>
            <p v-if="s.factored">
              {{ TOY.n }} = <b class="danger">{{ p }} × {{ q }}</b>: found instantly, so this toy key is broken. A real n has
              <b class="yellow">617 digits</b>, and no ordinary computer can split it.
            </p>
            <p v-else>Anyone who can split n into its two primes can rebuild the private key.</p>
          </div>
        </div>
      </template>
    </SpecimenFrame>
  </StationShell>
</template>

<style scoped>
.row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  margin-bottom: 16px;
}
.grow {
  flex: 1;
}
.math {
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(3, 6, 3, 0.5);
}
.math ol {
  margin: 10px 0 12px;
  padding-left: 18px;
  display: grid;
  gap: 6px;
  font-size: 13px;
  color: var(--text);
}
.math .k {
  color: var(--muted);
  margin-right: 6px;
}
.factor {
  display: flex;
  gap: 14px;
  align-items: center;
}
.factor p {
  font-size: 13.5px;
  color: var(--text-2);
}
.caption {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 14px;
  z-index: 2;
  display: flex;
  gap: 12px;
  align-items: baseline;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--line-2);
  background: rgba(3, 6, 3, 0.8);
  backdrop-filter: blur(6px);
  font-size: 14px;
  color: var(--text);
}
.caption__n {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--acid);
}
</style>
