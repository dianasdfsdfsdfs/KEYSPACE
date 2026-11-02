// Classical ciphers used by the timeline stations. Pure functions, no DOM.

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const A = 65;

export const isLetter = (ch) => /[A-Z]/i.test(ch);
export const letterIndex = (ch) => ch.toUpperCase().charCodeAt(0) - A;
export const mod = (n, m) => ((n % m) + m) % m;

/** Uppercase, keep letters and spaces, collapse whitespace, cap length. */
export function cleanText(text, max = 60) {
  return text
    .toUpperCase()
    .replace(/[^A-Z ]+/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, max);
}

/* ---------------- Caesar ---------------- */

export function shiftLetter(ch, k) {
  if (!isLetter(ch)) return ch;
  return ALPHABET[mod(letterIndex(ch) + k, 26)];
}

export const caesar = (text, k) => [...text.toUpperCase()].map((c) => shiftLetter(c, k)).join('');
export const uncaesar = (text, k) => caesar(text, -k);

/** Every possible Caesar key, as an attacker would try them. */
export const caesarBruteForce = (cipher) => Array.from({ length: 25 }, (_, i) => ({ shift: i + 1, text: uncaesar(cipher, i + 1) }));

/* ---------------- Frequency analysis ---------------- */

// Relative frequency of letters in English text (%), A–Z.
export const ENGLISH_FREQ = [
  8.2, 1.5, 2.8, 4.3, 12.7, 2.2, 2.0, 6.1, 7.0, 0.15, 0.77, 4.0, 2.4, 6.7, 7.5, 1.9, 0.095, 6.0, 6.3, 9.1, 2.8, 0.98, 2.4,
  0.15, 2.0, 0.074,
];

export function letterCounts(text) {
  const counts = new Array(26).fill(0);
  for (const ch of text.toUpperCase()) if (isLetter(ch)) counts[letterIndex(ch)]++;
  return counts;
}

export function letterFrequencies(text) {
  const counts = letterCounts(text);
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  return counts.map((c) => (c / total) * 100);
}

/** Chi-squared distance between a text (decrypted with `shift`) and English. Lower = more English. */
export function chiSquaredForShift(counts, shift) {
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  let chi = 0;
  for (let i = 0; i < 26; i++) {
    const observed = counts[mod(i + shift, 26)];
    const expected = (ENGLISH_FREQ[i] / 100) * total;
    chi += ((observed - expected) ** 2) / expected;
  }
  return chi;
}

/** Crack a Caesar cipher without a key: score all 26 shifts against English. */
export function crackCaesar(cipher) {
  const counts = letterCounts(cipher);
  const scores = Array.from({ length: 26 }, (_, s) => chiSquaredForShift(counts, s));
  let best = 0;
  for (let s = 1; s < 26; s++) if (scores[s] < scores[best]) best = s;
  return { shift: best, scores, plain: uncaesar(cipher, best) };
}

/* ---------------- Vigenère ---------------- */

export function cleanKey(key) {
  return key.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 12) || 'KEY';
}

/** Encrypt and return per-letter steps (plain, key letter, shift, cipher, key position). */
export function vigenere(text, key, decrypt = false) {
  const k = cleanKey(key);
  let j = 0;
  const steps = [];
  let out = '';
  for (const ch of text.toUpperCase()) {
    if (!isLetter(ch)) {
      out += ch;
      steps.push({ plain: ch, cipher: ch, keyChar: null, shift: 0, keyPos: -1 });
      continue;
    }
    const keyChar = k[j % k.length];
    const shift = letterIndex(keyChar);
    const c = shiftLetter(ch, decrypt ? -shift : shift);
    steps.push({ plain: ch, cipher: c, keyChar, shift, keyPos: j % k.length });
    out += c;
    j++;
  }
  return { text: out, steps, key: k };
}

/* ---------------- Scytale ---------------- */

/**
 * The strip is wound around a rod that fits `faces` letters around its
 * circumference. You write along the rod, row by row; unwinding reads the
 * letters column by column.
 */
export function scytale(text, faces) {
  const letters = text.toUpperCase().replace(/[^A-Z]/g, '');
  const turns = Math.max(1, Math.ceil(letters.length / faces));
  const padded = letters.padEnd(turns * faces, 'X');
  const rows = [];
  for (let r = 0; r < faces; r++) rows.push(padded.slice(r * turns, r * turns + turns));
  let strip = '';
  for (let c = 0; c < turns; c++) for (let r = 0; r < faces; r++) strip += rows[r][c];
  return { letters: padded, rows, strip, turns, faces };
}
