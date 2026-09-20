const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const decksRoutes = require('./routes/decks');

const app = express();

app.use(helmet());

/* The client is the only origin allowed to call this API, and the only one allowed credentials */
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

/* A deck of 200-character cards is still small, so anything past this is not a real request */
app.use(express.json({ limit: '256kb' }));

/* Overridable, since a browser suite drives dozens of registrations from one address and
   would otherwise spend the whole budget before reaching its own subject; anything blank or
   unparsable falls back rather than resolving to zero and refusing every request */
const configuredLimit = Number(process.env.AUTH_RATE_LIMIT_MAX);
const authMax = Number.isInteger(configuredLimit) && configuredLimit > 0
  ? configuredLimit
  : (process.env.NODE_ENV === 'test' ? 1000 : 20);

/* Guessing passwords or codes costs attempts, and this is what makes those attempts finite */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: authMax,
  message: { message: 'Too many requests from this IP, please try again later.' },
});

/* A tokenless endpoint that answers 200, so anything supervising this process can tell it
   is listening without having to interpret a 401 as good news */
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.use('/auth', authLimiter, authRoutes);
app.use('/decks', decksRoutes);

module.exports = app;
