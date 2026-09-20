import { test as base, expect, Page, APIRequestContext } from '@playwright/test';

/* ── fixtures ────────────────────────────────────────────────────────────────
   Page objects and the seeding helpers, so a markup change costs one edit and setup that
   is not the subject of a test goes through the API rather than the forms
   ───────────────────────────────────────────────────────────────────────── */

/* Every run needs an identity nobody else is using, so one is minted per test */
export const uniqueEmail = () => `e2e_${Date.now()}_${Math.floor(Math.random() * 1e6)}@puck.test`;
export const PASSWORD = 'e2e-Passw0rd!';

/* The API the client talks to, for setup that has no business going through the forms */
const API = process.env.E2E_API_URL ?? 'http://localhost:5001';

/* Only 01 tests registration, so everything else takes its account from the API */
export async function seedAccount(page: Page, request: APIRequestContext) {
  const email = uniqueEmail();
  await request.post(`${API}/auth/register`, { data: { email, password: PASSWORD } });
  const response = await request.post(`${API}/auth/login`, { data: { email, password: PASSWORD } });
  const { token } = await response.json();

  /* Runs before the app's own scripts on every navigation, so App sees the token on mount */
  await page.addInitScript(value => localStorage.setItem('token', value), token);
  return { email, token };
}

/* The games are not a test of the deck form, which 02 covers, so their deck arrives ready made */
export async function seedAccountWithDeck(
  page: Page,
  request: APIRequestContext,
  deck: { name: string; description: string; flashcards: { question: string; answer: string }[] }
) {
  const account = await seedAccount(page, request);
  await request.post(`${API}/decks`, {
    headers: { Authorization: `Bearer ${account.token}` },
    data: deck,
  });
  return account;
}

/* Page objects hold the selectors, so a markup change costs one edit and not twenty */
export class AuthPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  /* The tab carries role="tab", so asking for a button here matches nothing at all */
  async register(email: string, password = PASSWORD) {
    await this.page.getByRole('tab', { name: /^register$/i }).click();
    await this.page.getByLabel('Email:').fill(email);
    await this.page.getByLabel('Password:').fill(password);
    await this.page.getByRole('button', { name: /^register$/i }).click();
  }

  /* Registering issues no token, so signing in afterwards is what authenticates the browser */
  async registerAndSignIn(email: string, password = PASSWORD) {
    await this.register(email, password);
    /* The confirmation, then the form handing itself back to the login tab */
    await this.page.getByRole('status').waitFor();
    await this.page.getByRole('button', { name: /^login$/i }).waitFor();
    await this.login(email, password);
  }

  async login(email: string, password = PASSWORD) {
    await this.page.getByLabel('Email:').fill(email);
    await this.page.getByLabel('Password:').fill(password);
    await this.page.getByRole('button', { name: /^login$/i }).click();
  }

  async enterRecovery() {
    await this.page.getByRole('button', { name: /forgot/i }).click();
  }

  /* The control is labelled Get Code, which no amount of send-or-request matches */
  async requestCode(email: string) {
    await this.page.getByLabel('Email:').fill(email);
    await this.page.getByRole('button', { name: /get code/i }).click();
  }
}

export class HomePage {
  constructor(private readonly page: Page) {}

  decks = () => this.page.locator('.deck-item');
  deckNamed = (name: string) => this.page.locator('.deck-item', { hasText: name });
  continueButton = () => this.page.getByRole('button', { name: /continue/i });

  async goto() {
    await this.page.goto('/home');
  }

  async createDeck() {
    await this.page.getByRole('link', { name: /create deck/i }).click();
  }

  async select(name: string) {
    await this.deckNamed(name).click();
  }
}

export class DeckFormPage {
  constructor(private readonly page: Page) {}

  tiles = () => this.page.locator('.fc-tile');

  /* Name and description are edited through their own overlay rather than inline */
  async setName(name: string) {
    await this.page.getByRole('button', { name: /edit deck name/i }).click();
    await this.page.getByLabel('Deck Name:').fill(name);
    await this.page.getByRole('button', { name: /^done$/i }).click();
  }

  async setDescription(description: string) {
    await this.page.getByRole('button', { name: /edit description/i }).click();
    await this.page.getByLabel('Description:').fill(description);
    await this.page.getByRole('button', { name: /^done$/i }).click();
  }

  /* Both faces are required before the editor will accept the card */
  async addCard(question: string, answer: string) {
    await this.page.getByRole('button', { name: /add flashcard/i }).click();
    await this.page.getByLabel('Question:').fill(question);
    await this.page.getByLabel('Answer:').fill(answer);
    await this.page.getByRole('button', { name: /^done$/i }).click();
  }

  async save() {
    await this.page.getByRole('button', { name: /save deck/i }).click();
  }

  /* Creating stays on the form so another deck can follow, unlike editing */
  async saveAndReturn() {
    await this.save();
    /* The form emptying itself is the signal that the deck reached the server */
    await this.page.locator('.flashcard-empty-state').waitFor();
    await this.page.getByRole('link', { name: /back to home/i }).click();
  }
}

type Fixtures = { auth: AuthPage; home: HomePage; deckForm: DeckFormPage };

/* Injected as fixtures, so each test opens on intent rather than on construction */
export const test = base.extend<Fixtures>({
  auth: async ({ page }, use) => { await use(new AuthPage(page)); },
  home: async ({ page }, use) => { await use(new HomePage(page)); },
  deckForm: async ({ page }, use) => { await use(new DeckFormPage(page)); },
});

export { expect };
