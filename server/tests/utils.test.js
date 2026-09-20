import bcrypt from 'bcrypt';
import {
  validateEmail,
  validatePasswordLength,
  normaliseEmail,
  hashPassword,
  minPasswordLength,
} from '../utils/utils';

/* ── validation helpers ──────────────────────────────────────────────────────
   Pure functions with no database and no network, covering the address shapes
   that are accepted, the password minimum at its boundary, and the guards that
   let a missing field be refused rather than thrown on
   ───────────────────────────────────────────────────────────────────────── */

describe('validateEmail', () => {
  it('accepts well-formed addresses', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('first.last+tag@sub.domain.co')).toBe(true);
  });

  /* A missing field arrives as undefined, and a guard that throws turns that into a 500 */
  it('rejects anything that is not a string', () => {
    expect(validateEmail(undefined)).toBe(false);
    expect(validateEmail(null)).toBe(false);
    expect(validateEmail(42)).toBe(false);
  });

  it('rejects malformed addresses', () => {
    expect(validateEmail('plainaddress')).toBe(false);
    expect(validateEmail('missing-tld@domain')).toBe(false);
    expect(validateEmail('spaces in@mail.com')).toBe(false);
    expect(validateEmail('user@dom ain.com')).toBe(false);
    expect(validateEmail('@no-local-part.com')).toBe(false);
    expect(validateEmail('user@.com')).toBe(false);
  });
});

describe('validatePasswordLength', () => {
  it('enforces the minimum length exactly at the boundary', () => {
    expect(minPasswordLength).toBe(6);
    expect(validatePasswordLength('a'.repeat(minPasswordLength - 1))).toBe(false);
    expect(validatePasswordLength('a'.repeat(minPasswordLength))).toBe(true);
  });

  it('rejects a missing password rather than throwing on it', () => {
    expect(validatePasswordLength(undefined)).toBe(false);
    expect(validatePasswordLength(null)).toBe(false);
    expect(validatePasswordLength(123456)).toBe(false);
  });
});

describe('normaliseEmail', () => {
  /* One spelling of an address, or the same person registers twice and can log in as neither */
  it('lowercases and trims, so casing cannot create a second account', () => {
    expect(normaliseEmail('  Muki@Example.COM ')).toBe('muki@example.com');
    expect(normaliseEmail('muki@example.com')).toBe('muki@example.com');
  });

  it('answers with an empty string for anything that is not one', () => {
    expect(normaliseEmail(undefined)).toBe('');
    expect(normaliseEmail(null)).toBe('');
    expect(normaliseEmail(42)).toBe('');
  });
});

/* bcrypt embeds a fresh salt in every hash, so these assert behaviour rather than a value */
describe('hashPassword', () => {
  it('produces a salted bcrypt hash that verifies against the original only', async () => {
    const hash = await hashPassword('hunter22');

    expect(hash).not.toBe('hunter22');
    expect(hash.startsWith('$2')).toBe(true);
    await expect(bcrypt.compare('hunter22', hash)).resolves.toBe(true);
    await expect(bcrypt.compare('wrong-pw', hash)).resolves.toBe(false);
  });

  it('salts each hash, so identical inputs never collide', async () => {
    const [first, second] = await Promise.all([
      hashPassword('hunter22'),
      hashPassword('hunter22'),
    ]);
    expect(first).not.toBe(second);
  });
});