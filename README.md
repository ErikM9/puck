# Puck

[![CI](https://github.com/ErikM9/Puck/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/puck/actions/workflows/ci.yml)

A flashcard web app for building and studying personalised card decks.

## Features

- Register and log in with JWT-based authentication
- Recover a forgotten password with a one-time emailed code
- Create decks of flashcards with custom questions and answers
- Reorder, edit or delete cards while building a deck
- Edit or delete existing decks
- Select multiple decks and study them across three games:
  - **FlashFlip** — flip through cards one by one
  - **FlashChoice** — pick the correct answer from multiple options
  - **FlashMatch** — match questions to their answers side-by-side

## Tech Stack

| Layer    | Tech                                |
|----------|-------------------------------------|
| Client   | React 18, TypeScript, Vite          |
| Server   | Node.js, Express                    |
| Database | MongoDB with Mongoose               |
| Auth     | JWT (jsonwebtoken) + bcrypt         |
| Email    | Nodemailer (Gmail SMTP)             |
| Tests    | Vitest, Testing Library, Supertest, Playwright |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- A running MongoDB instance (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- A Gmail account with an App Password, if registration and recovery emails
  should actually send

### 1. Clone the repo

```bash
git clone https://github.com/your-username/puck.git
cd puck
```

### 2. Set up the server

```bash
cd server
npm install
cp env.example .env
```

Edit `server/.env` and fill in your values:

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/puck
JWT_SECRET=replace_this_with_a_long_random_secret
CLIENT_ORIGIN=http://localhost:5173
EMAIL_USER=youraddress@gmail.com
EMAIL_PASS=your_16_char_app_password
```

`AUTH_RATE_LIMIT_MAX` is optional. The `/auth` routes allow 20 requests per IP per 15
minutes by default, which is deliberately low; the e2e suite raises it for the server it
starts, because it drives dozens of registrations from one address.

`EMAIL_USER` and `EMAIL_PASS` drive the welcome and password-recovery emails.
`EMAIL_PASS` must be a 16-character Gmail **App Password**, not the account
password: enable 2-Step Verification, then Google Account → Security → App
Passwords. Leave them unset and the server still runs, but recovery codes are
never delivered — it logs a warning at boot to say so.

Start the server:

```bash
npm run dev       # development (nodemon)
npm start         # production
```

### 3. Set up the client

```bash
cd ../client
npm install
cp env.example .env
```

Edit `client/.env`:

```
VITE_API_BASE_URL=http://localhost:5000
```

Start the client:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Testing

Three levels, each answering something the level below cannot. `TESTING.md` maps every
suite to what it covers and why it sits where it does.

```bash
cd client && npm test          # 138 component, hook and routing tests (jsdom)
cd server && npm test          # 31 API integration tests (in-memory MongoDB)
cd client && npm run test:e2e  # 38 browser tests against the real stack
```

**Component and unit** run under jsdom with Testing Library, co-located with the code they
cover. **Integration** starts an in-memory MongoDB per file and drives the real Express app
through Supertest, with Nodemailer stubbed so nothing leaves the machine; the first run
downloads a MongoDB binary, so give it extra time.

**End-to-end** drives a real browser against the real client, API and database. It needs
Playwright's browsers, which are a separate download from the package:

```bash
cd client
npm install
npx playwright install
npm run test:e2e
```

Have MongoDB running first; both servers start themselves, on their own ports — the client
on 5174 and the API on 5001 — so a development stack on 5173 and 5000 can keep running
while the suite does. It uses one browser locally and all three under CI, or with
`E2E_ALL_BROWSERS=1`.

If a run is interrupted, its API can survive and hold 5001. Free it with:

```powershell
Get-NetTCPConnection -LocalPort 5001 -State Listen |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

Every run registers real accounts through the real API, so point `MONGO_URI` at a throwaway
database for it rather than one you care about.

### Continuous integration

Every push and pull request runs three jobs in parallel:

| Job | What it does |
|---|---|
| **client** | lint, `tsc -b` across all three projects, then the unit suite with coverage |
| **server** | the integration suite against an in-memory MongoDB |
| **e2e** | the browser suite against a real MongoDB service container, split into one job per browser |

The e2e job uploads its HTML report — traces, screenshots and video — as an artifact when it
fails, so a red build can be diagnosed without reproducing it locally.

---

## API

Every `/decks` route requires an `Authorization: Bearer <token>` header.

| Method | Route                     | Purpose                            |
|--------|---------------------------|------------------------------------|
| GET    | `/health`                 | Liveness check, no token needed    |
| POST   | `/auth/register`          | Create an account                  |
| POST   | `/auth/login`             | Exchange credentials for a JWT     |
| POST   | `/auth/logout`            | Acknowledge a client-side sign-out |
| POST   | `/auth/forgot-password`   | Email a one-time recovery code     |
| POST   | `/auth/verify-reset-code` | Check a code without spending it   |
| POST   | `/auth/reset-password`    | Spend a code to set a new password |
| GET    | `/decks`                  | List the signed-in user's decks    |
| POST   | `/decks`                  | Create a deck                      |
| GET    | `/decks/:id`              | Fetch one deck                     |
| PUT    | `/decks/:id`              | Replace a deck                     |
| DELETE | `/decks/:id`              | Delete a deck                      |

---

## Project Structure

```
puck/
├── client/                      # React + TypeScript front end
│   ├── e2e/                     # Playwright specs and their page objects
│   ├── public/                  # Served as-is (fairy.svg)
│   └── src/
│       ├── api/                 # Centralised Axios client and its interceptors
│       ├── test/                # Vitest setup shared by every client suite
│       └── Components/
│           ├── Auth/            # Auth page, login, register, password recovery
│           ├── Common/          # FitText, ScrollableBox, row layout helpers
│           ├── CreateDecks/     # Deck builder page + shared types
│           ├── Games/           # FlashFlip, FlashChoice, FlashMatch, Game menu
│           ├── Home/            # Deck list and selection
│           └── Navbar/
└── server/                      # Express API
    ├── config/                  # MongoDB connection
    ├── controllers/             # Route handlers
    ├── middleware/              # JWT auth middleware
    ├── models/                  # Mongoose schemas
    ├── routes/                  # Express routers
    ├── tests/                   # Vitest + Supertest integration suites
    └── utils/                   # Validation helpers and the email service
```

Component tests sit beside the code they cover — `HomePage.test.tsx` next to
`HomePage.tsx`. The server suites live together in `server/tests/`, and the browser suite
in `client/e2e/`, both because they test the system rather than any one file.

---

## Deployment notes

Behind a reverse proxy — most managed hosts, or nginx — set `app.set('trust proxy', 1)` in
`server/app.js`. Without it the rate limiter sees the proxy's address for every caller, so
the per-IP cap becomes one shared cap and stops doing its job. Do not set it when the server
is directly exposed, because then anyone can spoof `X-Forwarded-For`.
