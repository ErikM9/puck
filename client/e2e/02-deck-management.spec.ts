import { test, expect, seedAccount } from './support/fixtures';

/* ── 02-deck-management ──────────────────────────────────────────────────────
   The deck lifecycle through the UI, which is this file's subject, on a seeded account
   ───────────────────────────────────────────────────────────────────────── */

test.describe('Deck management', () => {

  /* The account is seeded, since 01 tests registration and this file tests decks */
  test.beforeEach(async ({ page, request }) => {
    await seedAccount(page, request);
    await page.goto('/home');
  });

  /* ── Lifecycle ──────────────────────────────────────────────────────────── */
  test('a deck can be created, appears on the deck list, and reports its card count', async ({ home, deckForm }) => {
    await home.createDeck();
    await deckForm.setName('Capital Cities');
    await deckForm.setDescription('Geography drills');
    await deckForm.addCard('Capital of France?', 'Paris');
    await deckForm.addCard('Capital of Japan?', 'Tokyo');
    await deckForm.addCard('Capital of Peru?', 'Lima');
    await deckForm.saveAndReturn();

    const deck = home.deckNamed('Capital Cities');
    await expect(deck).toBeVisible();
    await expect(deck).toContainText('3 cards');
  });

  test('an existing deck can be renamed and the list reflects it', async ({ home, deckForm }) => {
    await home.createDeck();
    await deckForm.setName('Before');
    await deckForm.setDescription('Desc');
    await deckForm.addCard('Q1', 'A1');
    await deckForm.addCard('Q2', 'A2');
    await deckForm.addCard('Q3', 'A3');
    await deckForm.saveAndReturn();

    await home.deckNamed('Before').getByRole('button', { name: /edit/i }).click();
    await deckForm.setName('After');
    await deckForm.save();

    await expect(home.deckNamed('After')).toBeVisible();
    await expect(home.deckNamed('Before')).toHaveCount(0);
  });

  test('a deck can be deleted and does not come back on reload', async ({ page, home, deckForm }) => {
    await home.createDeck();
    await deckForm.setName('Disposable');
    await deckForm.setDescription('Desc');
    await deckForm.addCard('Q1', 'A1');
    await deckForm.addCard('Q2', 'A2');
    await deckForm.addCard('Q3', 'A3');
    await deckForm.saveAndReturn();

    await home.deckNamed('Disposable').getByRole('button', { name: /delete/i }).click();
    await expect(home.deckNamed('Disposable')).toHaveCount(0);

    /* Reloading proves the deletion reached the database rather than only the store */
    await page.reload();
    await expect(home.deckNamed('Disposable')).toHaveCount(0);
  });

  /* ── Validation ─────────────────────────────────────────────────────────── */
  test.describe('validation', () => {

    test('a deck below the three-card minimum cannot be saved', async ({ page, home, deckForm }) => {
      await home.createDeck();
      await deckForm.setName('Too Short');
      await deckForm.setDescription('Desc');
      await deckForm.addCard('Only question', 'Only answer');

      /* The minimum keeps the control shut, so pressing it would wait for ever */
      await expect(page.getByRole('button', { name: /save deck/i })).toBeDisabled();
    });

    test('an unnamed deck cannot be saved', async ({ page, home, deckForm }) => {
      await home.createDeck();
      await deckForm.addCard('Q1', 'A1');
      await deckForm.addCard('Q2', 'A2');
      await deckForm.addCard('Q3', 'A3');
      await deckForm.save();

      await expect(page.locator('.error-message')).toBeVisible();
    });
  });

  /* ── Empty state ────────────────────────────────────────────────────────── */
  test('a fresh account is told how to begin rather than shown a blank panel', async ({ page }) => {
    await expect(page.locator('.flashcard-empty-state')).toBeVisible();
    await expect(page.locator('.flashcard-empty-state')).toContainText(/no decks yet/i);
  });

  /* ── Selection ──────────────────────────────────────────────────────────── */
  test('Continue stays disabled until at least one deck is selected', async ({ home, deckForm }) => {
    await home.createDeck();
    await deckForm.setName('Selectable');
    await deckForm.setDescription('Desc');
    await deckForm.addCard('Q1', 'A1');
    await deckForm.addCard('Q2', 'A2');
    await deckForm.addCard('Q3', 'A3');
    await deckForm.saveAndReturn();

    await expect(home.continueButton()).toBeDisabled();
    await home.select('Selectable');
    await expect(home.continueButton()).toBeEnabled();
  });
});
