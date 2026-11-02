// Textbook RSA with tiny primes — the classic worked example — so the maths
// is visible. Real keys use primes hundreds of digits long.
export const TOY = { p: 61n, q: 53n, n: 3233n, phi: 3120n, e: 17n, d: 2753n };

export function modPow(base, exp, m) {
  let result = 1n;
  base %= m;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % m;
    base = (base * base) % m;
    exp >>= 1n;
  }
  return result;
}

export const encrypt = (m, { e, n } = TOY) => modPow(BigInt(m), e, n);
export const decrypt = (c, { d, n } = TOY) => modPow(BigInt(c), d, n);

/** Trial division — instant for 3233, hopeless for a 617-digit modulus. */
export function factor(n) {
  n = BigInt(n);
  for (let i = 2n; i * i <= n; i++) if (n % i === 0n) return [i, n / i];
  return [n, 1n];
}

// A real-world sized modulus is ~617 decimal digits (2048 bits).
export const RSA_2048_DIGITS = 617;
