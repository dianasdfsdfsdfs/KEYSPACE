<script setup>
import LogoMark from './LogoMark.vue';
import { scrollToTarget } from '../../lib/scroll.js';
</script>

<template>
  <footer class="footer section">
    <div class="container footer__inner">
      <div class="footer__brand">
        <a href="#top" class="brand" @click.prevent="scrollToTarget('#top')">
          <LogoMark />
          <span class="brand__word"><span class="acid">KEY</span>SPACE</span>
        </a>
        <p>An interactive history of secrets, and how they get cracked. Everything on this page runs in your browser.</p>
      </div>
      <div class="footer__col">
        <p class="label label--muted">Further reading</p>
        <ul>
          <li><a href="https://csrc.nist.gov/pubs/fips/197/final" target="_blank" rel="noopener">FIPS 197 · the AES standard</a></li>
          <li><a href="https://csrc.nist.gov/projects/post-quantum-cryptography" target="_blank" rel="noopener">NIST post-quantum cryptography</a></li>
          <li><a href="https://haveibeenpwned.com/Passwords" target="_blank" rel="noopener">Have I Been Pwned · Pwned Passwords</a></li>
          <li><a href="https://www.eff.org/dice" target="_blank" rel="noopener">EFF dice-generated passphrases</a></li>
        </ul>
      </div>
      <div class="footer__col">
        <p class="label label--muted">Credits</p>
        <ul class="credits">
          <li>Breach data: Pwned Passwords by Have I Been Pwned, CC BY 4.0</li>
          <li>Strength estimates: zxcvbn-ts (MIT)</li>
          <li>Passphrase words: EFF Long Wordlist, CC BY 3.0 US</li>
          <li>Built with Vue, Three.js and GSAP</li>
        </ul>
      </div>
    </div>
    <div class="container footer__base mono">
      <span>© {{ new Date().getFullYear() }} KEYSPACE</span>
      <span>No cookies · no tracking · no passwords stored</span>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  border-top: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(3, 5, 3, 0.6), rgba(3, 5, 3, 0.95));
  padding: 64px 0 28px;
}
.footer__inner {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: 40px;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: var(--text);
  text-decoration: none !important;
  margin-bottom: 14px;
}
.brand__word {
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: 0.16em;
}
.footer__brand p {
  max-width: 40ch;
  font-size: 14.5px;
  color: var(--text-2);
}
.footer__col ul {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: grid;
  gap: 8px;
  font-size: 14px;
}
.credits {
  color: var(--muted);
}
.footer__base {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 48px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
  font-size: 11.5px;
  letter-spacing: 0.08em;
  color: var(--faint);
}
@media (max-width: 860px) {
  .footer__inner {
    grid-template-columns: 1fr;
  }
}
</style>
