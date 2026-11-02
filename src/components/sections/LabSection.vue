<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue';
import SpecimenFrame from '../timeline/SpecimenFrame.vue';
import ThreeCanvas from '../three/ThreeCanvas.vue';
import { loadStrength, secureRandom } from '../../lib/strength.js';
import {
  ATTACKERS,
  CHARSETS,
  bruteForce,
  charsetInfo,
  describeMatches,
  humanTime,
  relatable,
  ruleCandidates,
  nthGuess,
  scoreInfo,
  sciFromLog10,
  sha1Hex,
  breachCount,
} from '../../crypto/password.js';
import { bus } from '../../lib/bus.js';

const EXAMPLES = ['password123', 'Summer2024!', 'Tr0ub4dor&3', 'correct horse battery staple', 'x7#Qp!9vLm2@'];

const pw = ref('Summer2024!');
const show = ref(true);
const attackerId = ref('fast');
const lib = shallowRef(null);
const result = shallowRef(null);
const el = ref(null);

const attacker = computed(() => ATTACKERS.find((a) => a.id === attackerId.value));
const info = computed(() => charsetInfo(pw.value));
const bf = computed(() => bruteForce(pw.value));
const findings = computed(() => (result.value ? describeMatches(result.value.sequence) : []));
const score = computed(() => scoreInfo(result.value?.score ?? 0));
const smartLog10 = computed(() => (result.value ? result.value.guessesLog10 : bf.value.log10));
// seconds for a smart attacker (zxcvbn guesses) and for blind brute force (half the space on average)
const timeFor = (rate) => ({
  smart: Math.min(10 ** smartLog10.value, 10 ** (bf.value.log10 - Math.log10(2))) / rate,
  brute: 10 ** (bf.value.log10 - Math.log10(2)) / rate,
});
const times = computed(() => ATTACKERS.map((a) => ({ ...a, ...timeFor(a.rate) })));
const mine = computed(() => timeFor(attacker.value.rate));

// ---------- strength analysis (lazy-loaded) ----------
let checkSeq = 0;
async function analyse() {
  if (!lib.value) return;
  const seq = ++checkSeq;
  const r = await lib.value.check(pw.value || '');
  if (seq === checkSeq) result.value = r;
}
watch(pw, () => {
  analyse();
  stop();
  breach.status = 'idle';
});
let io;
onMounted(() => {
  io = new IntersectionObserver(
    ([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      loadStrength().then((l) => {
        lib.value = l;
        analyse();
      });
    },
    { rootMargin: '100% 0px' },
  );
  io.observe(el.value);
});

// ---------- attack simulation ----------
const sim = reactive({ running: false, stage: 'idle', log: [], display: '', elapsed: 0, stages: {} });
let timers = [];
const wait = (ms) => new Promise((res) => timers.push(setTimeout(res, ms)));
let runToken = 0;
function stop() {
  runToken++;
  timers.forEach(clearTimeout);
  timers = [];
  sim.running = false;
  sim.stage = 'idle';
  sim.display = '';
  sim.log = [];
  sim.stages = {};
}
onBeforeUnmount(() => {
  stop();
  io?.disconnect();
});
const mask = (s) => (show.value ? s : '•'.repeat([...s].length));
function log(text, kind = '') {
  sim.log.push({ text, kind, id: Math.random() });
  if (sim.log.length > 11) sim.log.shift();
}

async function run() {
  stop();
  const token = runToken;
  const alive = () => token === runToken;
  const p = pw.value;
  if (!p) return;
  if (!lib.value) lib.value = await loadStrength();
  if (!result.value) await analyse();
  const r = result.value;
  const rate = attacker.value.rate;
  sim.running = true;
  const crackSmart = mine.value.smart;
  const winTime = crackSmart < 3600; // the simulated attacker gives up after an hour of its time
  const seq = r.sequence || [];
  const common = seq.length === 1 && seq[0].pattern === 'dictionary' && String(seq[0].dictionaryName).startsWith('passwords');

  // 1 — dictionary of leaked passwords
  sim.stage = 'dictionary';
  sim.stages.dictionary = 'run';
  log(`$ crack --target ${attacker.value.id} --rate ${sciFromLog10(Math.log10(rate))}/s`, 'cmd');
  log('[1/3] dictionary attack · most-used leaked passwords', 'head');
  const top = lib.value.topPasswords;
  const limit = common ? Math.min(seq[0].rank, 18) : 18;
  for (let i = 0; i < limit && alive(); i++) {
    const w = String(top[i * Math.max(1, Math.floor((common ? seq[0].rank : 4000) / 18))] ?? top[i]);
    sim.display = w;
    log(`  try ${w.padEnd(16)} ✕`, 'miss');
    await wait(95);
  }
  if (!alive()) return;
  if (common) {
    sim.display = p;
    log(`  try ${mask(p).padEnd(16)} ✓ MATCH (#${seq[0].rank.toLocaleString('en-US')})`, 'hit');
    return finish(true, crackSmart);
  }
  sim.stages.dictionary = 'miss';

  // 2 — rules: words + years + symbols, l33t swaps, keyboard walks
  sim.stage = 'rules';
  sim.stages.rules = 'run';
  log('[2/3] rules · word + number + symbol, 1337 swaps, keyboard walks', 'head');
  const cands = ruleCandidates(p, seq, 14);
  for (const c of cands) {
    if (!alive()) return;
    if (winTime && c === p) break;
    const shown = show.value ? c : nthGuess(Math.random() * 1e9, info.value.alphabet, [...c].length);
    sim.display = shown;
    log(`  try ${shown.padEnd(16)} ✕`, 'miss');
    await wait(140);
  }
  if (!alive()) return;
  if (winTime) {
    sim.display = p;
    log(`  try ${mask(p).padEnd(16)} ✓ MATCH`, 'hit');
    return finish(true, crackSmart);
  }
  sim.stages.rules = 'miss';

  // 3 — brute force: every combination, odometer style
  sim.stage = 'brute';
  sim.stages.brute = 'run';
  log(`[3/3] brute force · ${info.value.size} symbols ^ ${bf.value.length} positions = ${sciFromLog10(bf.value.log10)} combos`, 'head');
  const alpha = info.value.alphabet;
  const len = Math.min(bf.value.length, 22);
  for (let i = 0; i < 16 && alive(); i++) {
    const g = nthGuess(i * 7919 + i * i * 104729, alpha, len);
    log(`  try ${g.slice(0, 22).padEnd(16)} ✕`, 'miss');
    await wait(150);
  }
  if (!alive()) return;
  log(`  blind brute force alone: ${humanTime(mine.value.brute)}`, 'miss');
  finish(false, mine.value.smart);
}

function finish(cracked, seconds) {
  sim.running = false;
  sim.elapsed = seconds;
  if (cracked) {
    sim.stage = 'cracked';
    sim.stages[sim.stages.rules === 'run' ? 'rules' : sim.stages.brute === 'run' ? 'brute' : 'dictionary'] = 'hit';
    log(`CRACKED in ${humanTime(seconds)} of attacker time · ${relatable(seconds)}`, 'crack');
    bus.emit('bg:alert', 1);
  } else {
    sim.stage = 'safe';
    sim.stages.brute = 'safe';
    log(`gave up · even a smart attack needs ${humanTime(seconds)}`, 'safe');
    log(`  that is ${relatable(seconds)}`, 'safe');
  }
}

// ---------- 3D params ----------
const cryptexMode = computed(() => {
  if (sim.stage === 'cracked') return 'cracked';
  if (sim.stage === 'safe') return 'safe';
  if (sim.stage === 'brute') return 'brute';
  if (sim.stage === 'dictionary' || sim.stage === 'rules') return sim.stage;
  return 'idle';
});
const params = computed(() => ({
  length: Math.max(1, [...pw.value].length),
  alphabet: info.value.alphabet,
  mode: cryptexMode.value,
  display: sim.stage === 'idle' ? (show.value ? pw.value : '') : sim.display,
  password: pw.value,
  masked: !show.value,
}));
const status = computed(
  () => ({ idle: 'Locked', dictionary: 'Dictionary attack', rules: 'Rule attack', brute: 'Brute force', cracked: 'Cracked', safe: 'Holding' })[sim.stage],
);
const tone = computed(() => (sim.stage === 'cracked' ? 'danger' : sim.stage === 'safe' ? 'acid' : sim.stage === 'idle' ? 'acid' : 'yellow'));

// ---------- helpers ----------
function generate() {
  if (!lib.value) return;
  const words = lib.value.words;
  const pick = () => words[secureRandom(words.length)];
  pw.value = [pick(), pick(), pick(), pick()].join('-');
  show.value = true;
}
const scale = { min: -2, max: 19 };
const pct = (sec) => {
  const l = Math.log10(Math.max(sec, 1e-3));
  return Math.max(0.5, Math.min(100, ((l - scale.min) / (scale.max - scale.min)) * 100));
};
const TICKS = [
  { s: 1, l: '1 sec' },
  { s: 86400, l: '1 day' },
  { s: 86400 * 365.25 * 100, l: '100 yrs' },
  { s: 86400 * 365.25 * 1.38e10, l: 'universe' },
];

// ---------- breach check (opt-in, k-anonymity) ----------
const breach = reactive({ status: 'idle', hash: '', count: 0 });
async function checkBreach() {
  if (!pw.value) return;
  breach.status = 'checking';
  try {
    breach.hash = await sha1Hex(pw.value);
    breach.count = await breachCount(breach.hash);
    breach.status = breach.count > 0 ? 'found' : 'clean';
    if (breach.count > 0) bus.emit('bg:alert', 0.8);
  } catch {
    breach.status = 'error';
  }
}
const tips = computed(() => {
  const fb = result.value?.feedback;
  const list = [];
  if (fb?.warning) list.push(fb.warning);
  for (const s of fb?.suggestions || []) list.push(s);
  if (!list.length) list.push('Nice. Keep it unique: never reuse it on another site.');
  return list.slice(0, 3);
});
</script>

<template>
  <section id="lab" ref="el" class="section lab">
    <div class="container">
      <header class="lab__head">
        <p class="label" v-reveal>Part three · Password Lab</p>
        <h2 class="section-title" v-reveal="0.05">Put your password <em>under attack</em></h2>
        <p class="lead" v-reveal="0.1">
          Type a password and watch a cracker go after it: first the leaked-password lists, then clever rules, then raw
          brute force. Everything runs in your browser; nothing is sent or stored.
          <span class="yellow">Tip: test a password like yours, not your real one.</span>
        </p>
      </header>

      <div class="lab__input panel brackets" v-reveal="0.12">
        <label class="sr-only" for="pw">Password to test</label>
        <div class="pwfield">
          <span class="pwfield__prompt mono">&gt;</span>
          <input
            id="pw"
            v-model="pw"
            :type="show ? 'text' : 'password'"
            class="pwfield__input"
            maxlength="64"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            placeholder="type a password…"
          />
          <button type="button" class="chip" @click="show = !show">{{ show ? 'Hide' : 'Show' }}</button>
          <button type="button" class="chip" :disabled="!lib" @click="generate">Generate passphrase</button>
        </div>
        <div class="examples">
          <span class="field__label">Try</span>
          <button v-for="ex in EXAMPLES" :key="ex" type="button" class="chip" @click="(pw = ex), (show = true)">{{ ex }}</button>
        </div>
      </div>

      <div class="lab__grid">
        <!-- Analysis -->
        <aside class="panel analysis" v-reveal="0.15">
          <p class="panel__title label">01 · Analysis</p>
          <div class="meter" :class="`tone-${score.tone}`">
            <div class="meter__bars">
              <i v-for="i in 5" :key="i" :class="{ on: (result?.score ?? 0) >= i - 1 && pw }"></i>
            </div>
            <span class="meter__label">{{ !pw ? '—' : result ? score.label : 'Analysing…' }}</span>
          </div>
          <dl class="kv">
            <dt>Length</dt>
            <dd>{{ bf.length }} characters</dd>
            <dt>Alphabet</dt>
            <dd>{{ info.size }} symbols</dd>
          </dl>
          <div class="sets">
            <span v-for="c in CHARSETS" :key="c.id" class="chip" :class="{ 'chip--on': info.used.includes(c.id) }">{{ c.label }}</span>
          </div>
          <div class="combos">
            <p class="field__label">Blind brute force</p>
            <p class="combos__n mono">{{ info.size }}<sup>{{ bf.length }}</sup> = {{ sciFromLog10(bf.log10) }}</p>
            <p class="combos__sub">combinations · about {{ Math.round(bf.log2) }} bits</p>
          </div>
          <div class="combos combos--smart">
            <p class="field__label">Smart attacker needs</p>
            <p class="combos__n mono">{{ sciFromLog10(Math.min(smartLog10, bf.log10)) }}</p>
            <p class="combos__sub">guesses, using the patterns below</p>
          </div>
          <ul class="findings">
            <li v-for="(f, i) in findings" :key="i" :class="{ bad: f.bad }">
              <span class="dot"></span>{{ f.kind === 'random' && !show ? 'Random-looking part, no pattern' : show ? f.text : f.text.replace(/“.*?”/, '“•••”') }}
            </li>
            <li v-if="!findings.length && !lib" class="muted">Loading the 50,000-password dictionary…</li>
          </ul>
        </aside>

        <!-- 3D cryptex -->
        <div class="center" v-reveal="0.1">
          <SpecimenFrame fig="LAB" title="Cryptex · one ring per character" :status="status" :status-tone="tone" hint="" height="clamp(300px, 26vw, 380px)">
            <template #scene>
              <ThreeCanvas
                :load="() => import('../../three/models/cryptex.js')"
                :stage="{ bloom: { strength: 0.6, radius: 0.45, threshold: 0.92 } }"
                :params="params"
                label="A cryptex lock with one lettered ring per password character. During brute force the rings spin like an odometer."
              />
            </template>
            <template #overlay>
              <div v-if="sim.stage === 'cracked' || sim.stage === 'safe'" class="verdict" :class="sim.stage">
                <span class="verdict__k">{{ sim.stage === 'cracked' ? 'Cracked in' : 'Would take' }}</span>
                <span class="verdict__v">{{ humanTime(sim.elapsed) }}</span>
                <span class="verdict__s">{{ relatable(sim.elapsed) }}</span>
              </div>
            </template>
          </SpecimenFrame>

          <div class="scale panel">
            <p class="panel__title label">Time to crack · by attacker</p>
            <div class="scale__rows">
              <div v-for="a in times" :key="a.id" class="scale__row" :class="{ on: a.id === attackerId }" @click="attackerId = a.id">
                <span class="scale__name">{{ a.label }}</span>
                <span class="scale__track">
                  <i class="scale__bar" :style="{ width: pct(a.smart) + '%' }"></i>
                  <i class="scale__ghost" :style="{ left: pct(a.brute) + '%' }" title="Blind brute force"></i>
                </span>
                <span class="scale__val">{{ humanTime(a.smart) }}</span>
              </div>
            </div>
            <div class="scale__ticks" aria-hidden="true">
              <span v-for="t in TICKS" :key="t.l" :style="{ left: pct(t.s) + '%' }">{{ t.l }}</span>
            </div>
            <p class="scale__note">Bars: a smart attacker using patterns. <i class="ghost-key"></i> Marker: blind brute force. Log scale.</p>
          </div>
        </div>

        <!-- Attack -->
        <aside class="panel attack" v-reveal="0.2">
          <p class="panel__title label">02 · Attack</p>
          <label class="field">
            <span class="field__label">Attacker</span>
            <select v-model="attackerId" class="input select">
              <option v-for="a in ATTACKERS" :key="a.id" :value="a.id">{{ a.label }}</option>
            </select>
          </label>
          <p class="attack__detail">{{ attacker.detail }}</p>
          <button type="button" class="btn btn--primary run" :disabled="!pw" @click="sim.running ? stop() : run()">
            {{ sim.running ? 'Stop' : sim.stage === 'idle' ? 'Run the attack' : 'Run again' }}
          </button>
          <ol class="stages">
            <li :class="sim.stages.dictionary"><span>1</span>Leaked-password lists</li>
            <li :class="sim.stages.rules"><span>2</span>Rules &amp; patterns</li>
            <li :class="sim.stages.brute"><span>3</span>Brute force</li>
          </ol>
          <div class="terminal mono" aria-live="polite">
            <p v-if="!sim.log.length" class="muted">$ waiting for a target_</p>
            <p v-for="l in sim.log" :key="l.id" :class="l.kind">{{ l.text }}</p>
          </div>
        </aside>
      </div>

      <div class="lab__bottom">
        <div class="panel card" v-reveal>
          <p class="panel__title label">03 · Has it leaked?</p>
          <p>
            Check against the hundreds of millions of real passwords exposed in data breaches. Your password never leaves
            the browser: it is hashed with SHA-1 and only the <b class="acid">first 5 characters</b> of the hash are sent
            (k-anonymity).
          </p>
          <div class="breach">
            <button type="button" class="btn btn--ghost btn--sm" :disabled="!pw || breach.status === 'checking'" @click="checkBreach">
              {{ breach.status === 'checking' ? 'Checking…' : 'Check known breaches' }}
            </button>
            <p v-if="breach.hash" class="hash mono">
              <b class="yellow">{{ breach.hash.slice(0, 5) }}</b><span>{{ breach.hash.slice(5) }}</span>
            </p>
          </div>
          <p v-if="breach.status === 'found'" class="danger result">
            Found {{ breach.count.toLocaleString('en-US') }} times in breaches. Attackers try it first, whatever its length.
          </p>
          <p v-else-if="breach.status === 'clean'" class="acid result">Not found in known breaches. That alone doesn’t make it strong.</p>
          <p v-else-if="breach.status === 'error'" class="muted result">Couldn’t reach the breach database right now.</p>
        </div>
        <div class="panel card" v-reveal="0.05">
          <p class="panel__title label">04 · Make it stronger</p>
          <ul class="tips">
            <li v-for="(t, i) in tips" :key="i">{{ t }}</li>
            <li>Length beats complexity: four random words are stronger than “P@ssw0rd!”.</li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.lab {
  padding: clamp(80px, 14vh, 160px) 0 clamp(60px, 10vh, 120px);
}
.lab__head {
  max-width: 860px;
  display: grid;
  gap: 18px;
  margin-bottom: 36px;
}
.lab__input {
  padding: 18px 20px;
  margin-bottom: 20px;
  border-color: var(--line-2);
}
.pwfield {
  display: flex;
  align-items: center;
  gap: 12px;
}
.pwfield__prompt {
  font-size: 28px;
  color: var(--acid);
}
.pwfield__input {
  flex: 1;
  min-width: 0;
  height: 60px;
  border: 0;
  background: transparent;
  font-family: var(--font-mono);
  font-size: clamp(22px, 2.4vw, 34px);
  letter-spacing: 0.06em;
  color: var(--text);
  caret-color: var(--acid);
}
.pwfield__input:focus {
  outline: none;
}
.examples {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}
.lab__grid {
  display: grid;
  grid-template-columns: minmax(250px, 300px) minmax(0, 1fr) minmax(280px, 340px);
  gap: 20px;
  align-items: start;
}
.panel {
  padding: 18px;
}
.panel__title {
  margin-bottom: 14px;
}
.meter {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.meter__bars {
  display: flex;
  gap: 4px;
}
.meter__bars i {
  width: 24px;
  height: 8px;
  border-radius: 3px;
  background: #1d2a18;
  transition: background 0.3s;
}
.tone-danger .meter__bars i.on {
  background: var(--danger);
}
.tone-yellow .meter__bars i.on {
  background: var(--yellow);
}
.tone-acid .meter__bars i.on {
  background: var(--acid);
}
.meter__label {
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.tone-danger .meter__label {
  color: var(--danger);
}
.tone-yellow .meter__label {
  color: var(--yellow);
}
.tone-acid .meter__label {
  color: var(--acid);
}
.sets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 12px 0 16px;
}
.combos {
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 10px;
  margin-bottom: 10px;
}
.combos__n {
  font-size: 18px;
  color: var(--text);
  margin-top: 4px;
}
.combos--smart .combos__n {
  color: var(--yellow);
}
.combos__sub {
  font-size: 12.5px;
  color: var(--muted);
}
.findings {
  list-style: none;
  padding: 0;
  margin: 14px 0 0;
  display: grid;
  gap: 8px;
  font-size: 13.5px;
  color: var(--text-2);
}
.findings li {
  display: grid;
  grid-template-columns: 14px 1fr;
  gap: 6px;
}
.findings .dot {
  width: 7px;
  height: 7px;
  margin-top: 7px;
  border-radius: 50%;
  background: var(--acid);
}
.findings li.bad .dot {
  background: var(--danger);
}
.muted {
  color: var(--muted);
}
.center {
  display: grid;
  gap: 20px;
  min-width: 0;
}
.verdict {
  position: absolute;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  z-index: 2;
  display: grid;
  justify-items: center;
  padding: 10px 18px;
  border-radius: 12px;
  background: rgba(3, 6, 3, 0.82);
  border: 1px solid var(--line-2);
  text-align: center;
}
.verdict.cracked {
  border-color: rgba(var(--danger-rgb), 0.6);
}
.verdict__k {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}
.verdict__v {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 700;
}
.verdict.cracked .verdict__v {
  color: var(--danger);
}
.verdict.safe .verdict__v {
  color: var(--acid);
}
.verdict__s {
  font-size: 13px;
  color: var(--text-2);
}
.scale__rows {
  display: grid;
  gap: 8px;
}
.scale__row {
  display: grid;
  grid-template-columns: 150px 1fr 104px;
  align-items: center;
  gap: 12px;
  padding: 4px 6px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}
.scale__row:hover,
.scale__row.on {
  background: rgba(182, 255, 0, 0.06);
}
.scale__name {
  font-size: 12.5px;
  color: var(--text-2);
}
.scale__row.on .scale__name {
  color: var(--acid);
}
.scale__track {
  position: relative;
  height: 10px;
  border-radius: 5px;
  background: #121a0f;
}
.scale__bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  border-radius: 5px;
  background: linear-gradient(90deg, var(--danger), var(--yellow) 55%, var(--acid));
  transition: width 0.6s var(--ease-out);
}
.scale__ghost,
.ghost-key {
  position: absolute;
  top: -3px;
  width: 2px;
  height: 16px;
  background: var(--text);
  opacity: 0.6;
  transition: left 0.6s var(--ease-out);
}
.ghost-key {
  position: relative;
  display: inline-block;
  top: 3px;
  margin: 0 4px;
}
.scale__val {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text);
  text-align: right;
}
.scale__ticks {
  position: relative;
  height: 18px;
  margin: 8px 116px 0 168px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--muted);
}
.scale__ticks span {
  position: absolute;
  transform: translateX(-50%);
  white-space: nowrap;
}
.scale__note {
  margin-top: 6px;
  font-size: 12px;
  color: var(--muted);
}
.select {
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, var(--acid) 50%), linear-gradient(135deg, var(--acid) 50%, transparent 50%);
  background-position:
    calc(100% - 18px) 21px,
    calc(100% - 13px) 21px;
  background-size: 5px 5px;
  background-repeat: no-repeat;
  font-size: 13px;
}
.attack__detail {
  font-size: 12.5px;
  color: var(--muted);
  margin: 8px 0 14px;
}
.run {
  width: 100%;
  margin-bottom: 14px;
}
.stages {
  list-style: none;
  padding: 0;
  margin: 0 0 12px;
  display: grid;
  gap: 6px;
  font-size: 13px;
  color: var(--muted);
}
.stages li {
  display: flex;
  align-items: center;
  gap: 10px;
}
.stages li span {
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid var(--line-2);
  font-family: var(--font-mono);
  font-size: 11px;
}
.stages li.run {
  color: var(--yellow);
}
.stages li.run span {
  border-color: var(--yellow);
  animation: pulse 1s infinite;
}
.stages li.miss {
  color: var(--text-2);
}
.stages li.miss span {
  background: #1d2a18;
}
.stages li.hit {
  color: var(--danger);
}
.stages li.hit span {
  background: var(--danger);
  color: #050705;
}
.stages li.safe {
  color: var(--acid);
}
.stages li.safe span {
  background: var(--acid);
  color: #050705;
}
@keyframes pulse {
  50% {
    box-shadow: 0 0 10px var(--yellow);
  }
}
.terminal {
  height: 238px;
  overflow: hidden;
  padding: 12px;
  border-radius: 10px;
  background: #020402;
  border: 1px solid var(--line);
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--muted);
  white-space: pre;
}
.terminal .cmd {
  color: var(--text-2);
}
.terminal .head {
  color: var(--yellow);
}
.terminal .hit {
  color: var(--danger);
  font-weight: 700;
}
.terminal .crack {
  color: #050705;
  background: var(--danger);
  padding: 0 4px;
  white-space: normal;
}
.terminal .safe {
  color: var(--acid);
  white-space: normal;
}
.lab__bottom {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 20px;
  margin-top: 20px;
}
.card p {
  font-size: 14.5px;
  color: var(--text-2);
}
.breach {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 14px 0 8px;
  flex-wrap: wrap;
}
.hash {
  font-size: 12.5px;
  word-break: break-all;
  color: var(--faint) !important;
}
.result {
  font-weight: 600;
}
.tips {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
  font-size: 14.5px;
  color: var(--text-2);
}
@media (max-width: 1200px) {
  .lab__grid {
    grid-template-columns: 1fr 1fr;
  }
  .center {
    grid-column: 1 / -1;
    order: -1;
  }
}
@media (max-width: 760px) {
  .lab__grid,
  .lab__bottom {
    grid-template-columns: 1fr;
  }
  .scale__row {
    grid-template-columns: 1fr;
  }
  .scale__ticks {
    margin: 8px 0 0;
  }
}
</style>
