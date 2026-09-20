import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { createRequire } from 'module';

/* Loaded through createRequire so the tests share the module instances the running app uses */
const require = createRequire(import.meta.url);
const { setTransporter } = require('../utils/emailService');
const app = require('../app');

/* The stub captures each message, which is also how these tests read a recovery code back */
const sendMail = vi.fn().mockResolvedValue({ messageId: 'test' });

beforeAll(() => {
  setTransporter({ sendMail, verify: async () => true });
});

/* ── auth API ────────────────────────────────────────────────────────────────
   The route, the controller, the model and a real in-memory database together,
   walking recovery from no code through issued, verified and spent, and checking
   that the answers refuse to disclose which addresses are registered
   ───────────────────────────────────────────────────────────────────────── */

/* app.js's require chain already registered the schemas, so models are read back off mongoose */
const User = mongoose.model('User');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

afterEach(async () => {
  await User.deleteMany({});
  sendMail.mockClear();
});

const EMAIL = 'muki@example.com';
const PASSWORD = 'hunter22';

const register = (email = EMAIL, password = PASSWORD) =>
  request(app).post('/auth/register').send({ email, password });
const login = (email = EMAIL, password = PASSWORD) =>
  request(app).post('/auth/login').send({ email, password });
const forgot = (email = EMAIL) =>
  request(app).post('/auth/forgot-password').send({ email });
const verifyCode = (code, email = EMAIL) =>
  request(app).post('/auth/verify-reset-code').send({ email, code });
const resetPassword = (code, newPassword, email = EMAIL) =>
  request(app).post('/auth/reset-password').send({ email, code, newPassword });

/* Reads the 6-digit code out of the most recently captured email */
const lastEmailedCode = () => {
  const html = sendMail.mock.calls.at(-1)[0].html;
  return html.match(/(\d{6})/)[1];
};

/* Registers a user, requests a code, and returns that code */
const setupRecovery = async () => {
  await register();
  sendMail.mockClear();
  await forgot();
  return lastEmailedCode();
};

describe('POST /auth/register', () => {
  it('creates the user with a hashed password and fires the welcome email', async () => {
    const res = await register();

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Registration successful! Please log in.');

    const user = await User.findOne({ email: EMAIL });
    expect(user).not.toBeNull();
    expect(user.password).not.toBe(PASSWORD);
    await expect(bcrypt.compare(PASSWORD, user.password)).resolves.toBe(true);

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].to).toBe(EMAIL);
    expect(sendMail.mock.calls[0][0].subject).toContain('Welcome');
  });

  it('rejects malformed emails without creating anything', async () => {
    const res = await register('not-an-email');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid email format');
    expect(await User.countDocuments()).toBe(0);
  });

  it('rejects passwords under the minimum length', async () => {
    const res = await register(EMAIL, 'abc12');

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/at least 6 characters/);
    expect(await User.countDocuments()).toBe(0);
  });

  it('rejects duplicate emails', async () => {
    await register();
    const res = await register();

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('This email is already in use');
    expect(await User.countDocuments()).toBe(1);
  });

  /* A guard that reads .length off a missing field turns the caller's mistake into a 500 */
  it('answers a missing password with 400 rather than a server error', async () => {
    const res = await request(app).post('/auth/register').send({ email: EMAIL });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/at least 6 characters/);
    expect(await User.countDocuments()).toBe(0);
  });

  /* Without normalisation the unique index sees two different strings and allows both */
  it('treats an address as the same account whatever its casing', async () => {
    await register('Muki@Example.COM');
    const res = await register('muki@example.com');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('This email is already in use');
    expect(await User.countDocuments()).toBe(1);

    /* Stored in one spelling, so the index has something consistent to enforce */
    const user = await User.findOne({});
    expect(user.email).toBe('muki@example.com');
  });

  it('signs in with a casing that differs from the one used to register', async () => {
    await register('Muki@Example.COM');
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'MUKI@example.com', password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });
});

describe('POST /auth/login', () => {
  it('returns a JWT whose payload identifies the user', async () => {
    await register();
    const res = await login();

    expect(res.status).toBe(200);
    const user = await User.findOne({ email: EMAIL });
    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(payload.userId).toBe(user._id.toString());
  });

  it('rejects a wrong password and an unknown email with an identical message', async () => {
    await register();

    const wrongPassword = await login(EMAIL, 'wrong-pw');
    const unknownEmail = await login('ghost@example.com', PASSWORD);

    /* Identical bodies stop the endpoint revealing which accounts exist */
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });
});

describe('POST /auth/logout', () => {
  it('acknowledges (the token itself is discarded client-side)', async () => {
    const res = await request(app).post('/auth/logout').send({});
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logout successful');
  });
});

describe('POST /auth/forgot-password', () => {
  it('stores a hashed, expiring code and emails the plaintext code', async () => {
    await register();
    sendMail.mockClear();
    const before = Date.now();

    const res = await forgot();

    expect(res.status).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(1);
    const code = lastEmailedCode();
    expect(code).toMatch(/^\d{6}$/);

    const user = await User.findOne({ email: EMAIL });
    expect(user.resetCodeHash).toBe(createHash('sha256').update(code).digest('hex'));
    expect(user.resetCodeAttempts).toBe(0);
    const ttl = user.resetCodeExpiry.getTime() - before;
    expect(ttl).toBeGreaterThan(14 * 60 * 1000);
    expect(ttl).toBeLessThanOrEqual(15 * 60 * 1000 + 5000);
  });

  it('responds identically for unknown emails and sends nothing', async () => {
    await register();
    sendMail.mockClear();

    const known = await forgot(EMAIL);
    sendMail.mockClear();
    const unknown = await forgot('ghost@example.com');

    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual(known.body);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('the cooldown silently swallows rapid repeat requests', async () => {
    await register();
    sendMail.mockClear();

    const first = await forgot();
    const second = await forgot();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });
});

describe('POST /auth/verify-reset-code', () => {
  it('wrong guesses burn attempts; the right code passes without being consumed', async () => {
    const code = await setupRecovery();
    const wrongCode = code === '000000' ? '000001' : '000000';

    const wrong = await verifyCode(wrongCode);
    expect(wrong.status).toBe(400);
    expect(wrong.body.message).toBe('Invalid or expired code.');
    expect((await User.findOne({ email: EMAIL })).resetCodeAttempts).toBe(1);

    const right = await verifyCode(code);
    expect(right.status).toBe(200);
    expect((await User.findOne({ email: EMAIL })).resetCodeHash).not.toBeNull();
  });

  it('five wrong attempts lock the code out, even for the correct value', async () => {
    const code = await setupRecovery();
    const wrongCode = code === '000000' ? '000001' : '000000';

    for (let i = 0; i < 5; i++) {
      await verifyCode(wrongCode);
    }
    const lockedOut = await verifyCode(code);

    expect(lockedOut.status).toBe(429);
    expect(lockedOut.body.message).toMatch(/Too many attempts/);
  });
});

describe('POST /auth/reset-password', () => {
  it('the full recovery flow: new password works, old one is dead, state is cleared', async () => {
    const code = await setupRecovery();

    expect((await verifyCode(code)).status).toBe(200);
    const res = await resetPassword(code, 'newpass99');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Password reset successful! Please log in.');

    expect((await login(EMAIL, PASSWORD)).status).toBe(401);
    expect((await login(EMAIL, 'newpass99')).status).toBe(200);

    const user = await User.findOne({ email: EMAIL });
    expect(user.resetCodeHash).toBeNull();
    expect(user.resetCodeExpiry).toBeNull();
    expect(user.resetCodeAttempts).toBe(0);
  });

  it('a code cannot be reused after a successful reset', async () => {
    const code = await setupRecovery();
    await resetPassword(code, 'newpass99');

    const replay = await resetPassword(code, 'evilpass1');

    expect(replay.status).toBe(400);
    expect((await login(EMAIL, 'newpass99')).status).toBe(200);
  });

  it('rejects expired codes', async () => {
    const code = await setupRecovery();
    await User.updateOne(
      { email: EMAIL },
      { resetCodeExpiry: new Date(Date.now() - 1000) }
    );

    const res = await resetPassword(code, 'newpass99');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid or expired code.');
    expect((await login(EMAIL, PASSWORD)).status).toBe(200);
  });

  it('rejects new passwords under the minimum length without burning the code', async () => {
    const code = await setupRecovery();

    const res = await resetPassword(code, 'abc');

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/at least 6 characters/);
    expect((await resetPassword(code, 'newpass99')).status).toBe(200);
  });
});
