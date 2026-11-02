import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCipheriv } from 'node:crypto';
import { caesar, uncaesar, crackCaesar, vigenere, scytale, letterFrequencies } from '../src/crypto/classical.js';
import { Enigma, ENIGMA_KEYSPACE } from '../src/crypto/enigma.js';
import { encryptBlockTrace, fromHex, toHex, SBOX, textToBlock, bitDiff } from '../src/crypto/aes.js';
import { TOY, encrypt, decrypt, factor } from '../src/crypto/rsa.js';

test('Caesar shifts and wraps', () => {
  assert.equal(caesar('VENI VIDI VICI', 3), 'YHQL YLGL YLFL');
  assert.equal(caesar('XYZ', 3), 'ABC');
  assert.equal(uncaesar('YHQL', 3), 'VENI');
});

test('frequency analysis cracks a Caesar cipher', () => {
  const plain = 'THE SECRET OF GETTING AHEAD IS GETTING STARTED THE SECRET OF GETTING STARTED IS BREAKING YOUR COMPLEX OVERWHELMING TASKS INTO SMALL MANAGEABLE TASKS';
  const cipher = caesar(plain, 11);
  const res = crackCaesar(cipher);
  assert.equal(res.shift, 11);
  assert.equal(res.plain, plain);
  const f = letterFrequencies('AAB');
  assert.ok(Math.abs(f[0] - 66.666) < 0.01);
});

test('Vigenère matches the textbook example', () => {
  assert.equal(vigenere('ATTACKATDAWN', 'LEMON').text, 'LXFOPVEFRNHR');
  assert.equal(vigenere('LXFOPVEFRNHR', 'LEMON', true).text, 'ATTACKATDAWN');
});

test('Scytale writes rows and reads columns', () => {
  const r = scytale('HELLOWORLD', 2); // 2 faces, 5 turns
  assert.deepEqual(r.rows, ['HELLO', 'WORLD']);
  assert.equal(r.strip, 'HWEOLRLLOD');
});

test('Enigma I: AAAAA → BDZGO (rotors I-II-III, reflector B, AAA)', () => {
  const m = new Enigma({ rotors: ['I', 'II', 'III'], positions: 'AAA', rings: 'AAA' });
  assert.equal(m.encrypt('AAAAA'), 'BDZGO');
});

test('Enigma is its own inverse and never maps a letter to itself', () => {
  const plain = 'WETTERVORHERSAGEBISKAYA';
  const c = new Enigma({ positions: 'QEV', plugs: 'AZ BY CX' }).encrypt(plain);
  const back = new Enigma({ positions: 'QEV', plugs: 'AZ BY CX' }).encrypt(c);
  assert.equal(back, plain);
  for (let i = 0; i < plain.length; i++) assert.notEqual(plain[i], c[i]);
});

test('Enigma double-steps the middle rotor', () => {
  const m = new Enigma({ positions: 'ADU' });
  const seen = [];
  for (let i = 0; i < 4; i++) seen.push(m.press('A').positions);
  assert.deepEqual(seen, ['ADV', 'AEW', 'BFX', 'BFY']);
});

test('Enigma keyspace figure', () => {
  // 60 rotor orders × 26³ positions × plugboard(10 cables)
  const fact = (n) => (n <= 1n ? 1n : n * fact(n - 1n));
  const plug = fact(26n) / (fact(6n) * fact(10n) * 2n ** 10n);
  assert.equal(60n * 17576n * plug, ENIGMA_KEYSPACE);
});

test('AES-128 matches FIPS-197 Appendix C.1', () => {
  assert.equal(SBOX[0x53], 0xed);
  const key = fromHex('000102030405060708090a0b0c0d0e0f');
  const pt = fromHex('00112233445566778899aabbccddeeff');
  const { output, steps } = encryptBlockTrace(pt, key);
  assert.equal(toHex(output), '69c4e0d86a7b0430d8cdb78070b4c55a');
  assert.equal(steps.at(-1).round, 10);
});

test('AES agrees with Node crypto on text input', () => {
  const key = textToBlock('KEYSPACE-SECRET!');
  const pt = textToBlock('ATTACK AT DAWN!!');
  const ours = toHex(encryptBlockTrace(pt, key).output);
  const c = createCipheriv('aes-128-ecb', key, null);
  c.setAutoPadding(false);
  const theirs = Buffer.concat([c.update(pt), c.final()]).toString('hex');
  assert.equal(ours, theirs);
  const flipped = textToBlock('ATTACK AT DAWN!"');
  const diff = bitDiff(encryptBlockTrace(pt, key).output, encryptBlockTrace(flipped, key).output);
  assert.ok(diff > 40 && diff < 90, `avalanche ${diff}`);
});

test('toy RSA round-trips and factors', () => {
  const c = encrypt(65n);
  assert.equal(c, 2790n);
  assert.equal(decrypt(c), 65n);
  assert.deepEqual(factor(TOY.n), [53n, 61n]);
});
