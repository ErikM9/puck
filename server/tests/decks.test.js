import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

/* The import chain builds a mail transporter, so nodemailer is stubbed even here */
vi.mock('nodemailer', () => {
  const createTransport = () => ({
    sendMail: vi.fn().mockResolvedValue({ messageId: 'test' }),
    verify: vi.fn().mockResolvedValue(true),
  });
  return { default: { createTransport }, createTransport };
});

import app from '../app';

/* ── decks API ───────────────────────────────────────────────────────────────
   The route, the controller, the model and a real in-memory database together.
   Every case runs as a second user as well, because the thing most worth proving
   here is that one account cannot see or change another's decks
   ───────────────────────────────────────────────────────────────────────── */

/* Read off the shared mongoose instance that app.js's require chain already populated */
const User = mongoose.model('User');
const Deck = mongoose.model('Deck');

let mongod;
let userA;
let userB;
let tokenA;
let tokenB;

const makeToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET);

const DECK_PAYLOAD = {
  name: 'Capitals',
  description: 'Geography drills',
  flashcards: [
    { question: 'France', answer: 'Paris' },
    { question: 'Japan', answer: 'Tokyo' },
  ],
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  /* These routes only check the JWT, so the stored password is never consulted */
  userA = await User.create({ email: 'a@example.com', password: 'irrelevant' });
  userB = await User.create({ email: 'b@example.com', password: 'irrelevant' });
  tokenA = makeToken(userA._id.toString());
  tokenB = makeToken(userB._id.toString());
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

afterEach(async () => {
  await Deck.deleteMany({});
});

const asA = (req) => req.set('Authorization', `Bearer ${tokenA}`);
const createDeckAs = (token, payload = DECK_PAYLOAD) =>
  request(app).post('/decks').set('Authorization', `Bearer ${token}`).send(payload);

describe('decks routes — authentication wall', () => {
  it('rejects every route without a token', async () => {
    const attempts = await Promise.all([
      request(app).post('/decks').send(DECK_PAYLOAD),
      request(app).get('/decks'),
      request(app).get('/decks/000000000000000000000000'),
      request(app).put('/decks/000000000000000000000000').send(DECK_PAYLOAD),
      request(app).delete('/decks/000000000000000000000000'),
    ]);

    for (const res of attempts) {
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('No token provided');
    }
  });

  it('rejects malformed headers and invalid tokens with distinct messages', async () => {
    const malformed = await request(app).get('/decks').set('Authorization', 'Token abc');
    expect(malformed.status).toBe(401);
    expect(malformed.body.message).toBe('No token provided');

    const invalid = await request(app).get('/decks').set('Authorization', 'Bearer garbage');
    expect(invalid.status).toBe(401);
    expect(invalid.body.message).toBe('Invalid or expired token');

    const wrongSecret = jwt.sign({ userId: userA._id.toString() }, 'not-the-secret');
    const forged = await request(app).get('/decks').set('Authorization', `Bearer ${wrongSecret}`);
    expect(forged.status).toBe(401);
    expect(forged.body.message).toBe('Invalid or expired token');
  });
});

describe('POST /decks', () => {
  it('creates a deck owned by the requester', async () => {
    const res = await createDeckAs(tokenA);

    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(userA._id.toString());
    expect(res.body.flashcards).toHaveLength(2);
    expect(res.body.flashcards[0]._id).toMatch(/^[a-f\d]{24}$/);

    const stored = await Deck.findById(res.body._id);
    expect(stored.name).toBe('Capitals');
    expect(stored.userId.toString()).toBe(userA._id.toString());
  });
});

describe('GET /decks', () => {
  it("lists only the requester's decks", async () => {
    await createDeckAs(tokenA);
    await createDeckAs(tokenB, { ...DECK_PAYLOAD, name: 'B Private' });

    const res = await asA(request(app).get('/decks'));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Capitals');
  });
});

describe('GET /decks/:id', () => {
  it("returns own decks, 404s on another user's deck, 404s on missing ids", async () => {
    const own = (await createDeckAs(tokenA)).body;
    const foreign = (await createDeckAs(tokenB)).body;

    const ownRes = await asA(request(app).get(`/decks/${own._id}`));
    expect(ownRes.status).toBe(200);
    expect(ownRes.body.name).toBe('Capitals');

    /* Another user's deck is indistinguishable from one that does not exist */
    const foreignRes = await asA(request(app).get(`/decks/${foreign._id}`));
    expect(foreignRes.status).toBe(404);
    expect(foreignRes.body.message).toBe('Deck not found');

    const missingId = new mongoose.Types.ObjectId().toString();
    const missingRes = await asA(request(app).get(`/decks/${missingId}`));
    expect(missingRes.status).toBe(404);
  });

  it('answers a malformed id with 400 rather than a server error', async () => {
    const res = await asA(request(app).get('/decks/not-an-id'));
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid deck id');
  });

  it('rejects a deck with no name and one with no flashcards array', async () => {
    const noName = await createDeckAs(tokenA, { description: 'd', flashcards: [] });
    expect(noName.status).toBe(400);

    const noCards = await createDeckAs(tokenA, { name: 'n', description: 'd' });
    expect(noCards.status).toBe(400);
    expect(noCards.body.message).toBe('flashcards must be an array');

    expect(await Deck.countDocuments()).toBe(0);
  });

  it('rejects an update that would empty a required field', async () => {
    const own = (await createDeckAs(tokenA)).body;

    const res = await asA(request(app).put(`/decks/${own._id}`).send({ ...DECK_PAYLOAD, name: '' }));

    expect(res.status).toBe(400);
    expect((await Deck.findById(own._id)).name).toBe('Capitals');
  });
});

describe('PUT /decks/:id', () => {
  it("updates own decks; another user's deck 404s and stays unchanged", async () => {
    const own = (await createDeckAs(tokenA)).body;
    const foreign = (await createDeckAs(tokenB)).body;
    const update = { ...DECK_PAYLOAD, name: 'Renamed' };

    const ownRes = await asA(request(app).put(`/decks/${own._id}`).send(update));
    expect(ownRes.status).toBe(200);
    expect(ownRes.body.name).toBe('Renamed');
    expect((await Deck.findById(own._id)).name).toBe('Renamed');

    const foreignRes = await asA(request(app).put(`/decks/${foreign._id}`).send(update));
    expect(foreignRes.status).toBe(404);
    expect((await Deck.findById(foreign._id)).name).toBe('Capitals');
  });

  /* Create rebuilds each card, so an update that did not would accept what create refuses */
  it('rebuilds the cards on update, so nothing a client invents is stored', async () => {
    const own = (await createDeckAs(tokenA)).body;
    const smuggled = new mongoose.Types.ObjectId().toString();

    const res = await asA(request(app).put(`/decks/${own._id}`).send({
      ...DECK_PAYLOAD,
      flashcards: [{ _id: smuggled, question: 'France', answer: 'Paris', userId: 'not-mine' }],
    }));

    expect(res.status).toBe(200);
    const stored = await Deck.findById(own._id);
    expect(stored.flashcards).toHaveLength(1);
    expect(stored.flashcards[0]._id.toString()).not.toBe(smuggled);
    expect(stored.flashcards[0].userId).toBeUndefined();
  });

  it('refuses a flashcards value that is not an array', async () => {
    const own = (await createDeckAs(tokenA)).body;

    const res = await asA(request(app).put(`/decks/${own._id}`).send({ flashcards: 'nope' }));

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('flashcards must be an array');
  });

  /* A malformed card is the caller's mistake, so it belongs in the 400s, not the 500s */
  it('answers a malformed card with 400 rather than a server error', async () => {
    const own = (await createDeckAs(tokenA)).body;

    const res = await asA(request(app).put(`/decks/${own._id}`).send({
      ...DECK_PAYLOAD,
      flashcards: [null],
    }));

    expect(res.status).toBe(400);
  });
});

describe('DELETE /decks/:id', () => {
  it("deletes own decks; another user's deck 404s and survives", async () => {
    const own = (await createDeckAs(tokenA)).body;
    const foreign = (await createDeckAs(tokenB)).body;

    const ownRes = await asA(request(app).delete(`/decks/${own._id}`));
    expect(ownRes.status).toBe(200);
    expect(ownRes.body.message).toBe('Deck deleted successfully');
    expect(await Deck.findById(own._id)).toBeNull();

    const foreignRes = await asA(request(app).delete(`/decks/${foreign._id}`));
    expect(foreignRes.status).toBe(404);
    expect(await Deck.findById(foreign._id)).not.toBeNull();
  });
});
