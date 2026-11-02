// Password analysis for the lab. Everything here runs locally in the browser.

export const CHARSETS = [
  { id: 'lower', label: 'a–z', size: 26, test: /[a-z]/, chars: 'abcdefghijklmnopqrstuvwxyz' },
  { id: 'upper', label: 'A–Z', size: 26, test: /[A-Z]/, chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
  { id: 'digit', label: '0–9', size: 10, test: /[0-9]/, chars: '0123456789' },
  { id: 'symbol', label: '!#$…', size: 33, test: /[^a-zA-Z0-9]/, chars: ' !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~' },
];

/** Which character families a password uses, and the resulting alphabet. */
export function charsetInfo(pw) {
  const used = CHARSETS.filter((c) => c.test.test(pw));
  const size = used.reduce((a, c) => a + c.size, 0);
  const alphabet = used.map((c) => c.chars).join('') || CHARSETS[0].chars;
  return { used: used.map((c) => c.id), size: size || 26, alphabet };
}

/** Blind brute force: every combination of the alphabet at this length. */
export function bruteForce(pw) {
  const { size } = charsetInfo(pw);
  const L = [...pw].length;
  return { log10: L * Math.log10(size), log2: L * Math.log2(size), size, length: L };
}

// Guess rates (per second) for realistic attackers.
export const ATTACKERS = [
  { id: 'online', label: 'Online login', detail: 'A website that limits attempts: about 10 guesses per second', rate: 10 },
  { id: 'slow', label: 'Leaked database · slow hash', detail: 'Passwords stored with bcrypt, one gaming GPU: ~10 thousand guesses/s', rate: 1e4 },
  { id: 'fast', label: 'Leaked database · fast hash', detail: 'Passwords stored with MD5, one high-end GPU: ~100 billion guesses/s', rate: 1e11 },
  { id: 'farm', label: 'GPU farm · fast hash', detail: 'A rack of 100 GPUs: ~10 trillion guesses/s', rate: 1e13 },
];

const MIN = 60;
const HOUR = 3600;
const DAY = 86400;
const YEAR = 365.25 * DAY;
const UNIVERSE = 1.38e10 * YEAR;

function plural(n, word) {
  const r = n < 10 ? Math.round(n * 10) / 10 : Math.round(n);
  return `${r.toLocaleString('en-US')} ${word}${r === 1 ? '' : 's'}`;
}

/** Seconds → short human text ("3 hours", "4.2 × 10¹² years"). */
export function humanTime(seconds) {
  if (!Number.isFinite(seconds) || seconds > 1e300) return 'forever';
  if (seconds < 1e-3) return 'instantly';
  if (seconds < 1) return 'under a second';
  if (seconds < MIN) return plural(seconds, 'second');
  if (seconds < HOUR) return plural(seconds / MIN, 'minute');
  if (seconds < DAY) return plural(seconds / HOUR, 'hour');
  if (seconds < 31 * DAY) return plural(seconds / DAY, 'day');
  if (seconds < YEAR) return plural(seconds / (30.44 * DAY), 'month');
  const years = seconds / YEAR;
  if (years < 1e6) return plural(years, 'year');
  if (years < 1e9) return `${Math.round(years / 1e6).toLocaleString('en-US')} million years`;
  if (years < 1e12) return `${Math.round(years / 1e9).toLocaleString('en-US')} billion years`;
  return `${sci(years)} years`;
}

/** A relatable comparison for a duration. */
export function relatable(seconds) {
  if (seconds < 1) return 'faster than a blink';
  if (seconds < 3 * MIN) return 'before your kettle boils';
  if (seconds < HOUR) return 'during a coffee break';
  if (seconds < DAY) return 'overnight';
  if (seconds < YEAR) return 'before your next birthday';
  if (seconds < 100 * YEAR) return 'within a human lifetime';
  if (seconds < 5000 * YEAR) return 'longer than many lifetimes';
  if (seconds < 4.5e9 * YEAR) return 'longer than all of recorded history';
  if (seconds < UNIVERSE) return 'longer than Earth has existed';
  return 'longer than the age of the universe';
}

const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
/** 4.2 × 10¹² */
export function sci(n) {
  if (n < 1e6) return Math.round(n).toLocaleString('en-US');
  const e = Math.floor(Math.log10(n));
  const m = n / 10 ** e;
  return `${m.toFixed(1)} × 10${String(e)
    .split('')
    .map((d) => SUP[d])
    .join('')}`;
}
export const sciFromLog10 = (log10) => {
  if (log10 < 6) return Math.round(10 ** log10).toLocaleString('en-US');
  const e = Math.floor(log10);
  const m = 10 ** (log10 - e);
  return `${m.toFixed(1)} × 10${String(e)
    .split('')
    .map((d) => SUP[d])
    .join('')}`;
};

const SCORE = [
  { label: 'Very weak', tone: 'danger' },
  { label: 'Weak', tone: 'danger' },
  { label: 'Fair', tone: 'yellow' },
  { label: 'Strong', tone: 'acid' },
  { label: 'Very strong', tone: 'acid' },
];
export const scoreInfo = (s) => SCORE[s] ?? SCORE[0];

/** Turn zxcvbn matches into plain-English findings. */
export function describeMatches(sequence = []) {
  return sequence
    .map((m) => {
      const tok = m.token;
      switch (m.pattern) {
        case 'dictionary': {
          const src = String(m.dictionaryName || '');
          const where = src.startsWith('passwords')
            ? `#${m.rank.toLocaleString('en-US')} on the list of most-used passwords`
            : src.startsWith('diceware')
              ? 'a dictionary word'
              : src.includes('names') || src.includes('firstnames') || src.includes('lastnames')
                ? 'a common name'
                : 'a common word';
          const extra = m.l33t ? ' (with 1337-speak swaps)' : m.reversed ? ' (reversed)' : '';
          return { kind: 'word', bad: true, token: tok, text: `“${tok}” is ${where}${extra}` };
        }
        case 'spatial':
          return { kind: 'keyboard', bad: true, token: tok, text: `“${tok}” is a keyboard pattern` };
        case 'repeat':
          return { kind: 'repeat', bad: true, token: tok, text: `“${tok}” repeats itself` };
        case 'sequence':
          return { kind: 'sequence', bad: true, token: tok, text: `“${tok}” is a sequence` };
        case 'date':
          return { kind: 'date', bad: true, token: tok, text: `“${tok}” looks like a date` };
        case 'regex':
          return { kind: 'year', bad: true, token: tok, text: `“${tok}” looks like a recent year` };
        case 'separator':
          return { kind: 'separator', bad: false, token: tok, text: 'Words separated by a space or symbol' };
        case 'bruteforce':
          return { kind: 'random', bad: false, token: tok, text: `“${tok}” has no obvious pattern` };
        default:
          return { kind: m.pattern, bad: true, token: tok, text: `“${tok}” follows a known pattern` };
      }
    })
    .filter(Boolean);
}

/** Build a believable stream of guesses that walks toward the password (for the terminal). */
export function ruleCandidates(pw, sequence = [], count = 14) {
  const out = [];
  const tokens = sequence.map((m) => m.token);
  const years = ['2023', '2024', '2025', '1990', '123', '1', '!', '!!', '01'];
  const caps = (w) => w.charAt(0).toUpperCase() + w.slice(1);
  const leet = (w) => w.replace(/a/gi, '@').replace(/o/gi, '0').replace(/e/gi, '3').replace(/s/gi, '$');
  const base = tokens[0] || pw.slice(0, 4);
  const variants = [base.toLowerCase(), caps(base.toLowerCase()), base.toUpperCase(), leet(base.toLowerCase())];
  for (const v of variants) for (const y of years) if (out.length < count - 1) out.push(v + y);
  // walk toward the real password
  let prefix = '';
  for (const t of tokens) {
    prefix += t;
    out.push(prefix + (prefix.length < pw.length ? years[out.length % years.length] : ''));
  }
  return out.slice(-count);
}

/** Odometer-style brute-force guess for a counter value. */
export function nthGuess(n, alphabet, length) {
  const N = alphabet.length;
  let s = '';
  let x = Math.floor(n);
  for (let i = 0; i < length; i++) {
    s = alphabet[x % N] + s;
    x = Math.floor(x / N);
  }
  return s;
}

/** k-anonymity breach lookup: only the first 5 hex chars of the SHA-1 hash are sent. */
export async function sha1Hex(text) {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}
export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}
export async function breachCount(hash) {
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, { headers: { 'Add-Padding': 'true' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.text();
  for (const line of body.split('\n')) {
    const [suf, count] = line.trim().split(':');
    if (suf === suffix) return Number(count) || 0;
  }
  return 0;
}
