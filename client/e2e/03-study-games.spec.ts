import { test, expect, seedAccountWithDeck } from './support/fixtures';

/* ── 03-study-games ──────────────────────────────────────────────────────────
   Each game played through, with its deck seeded rather than built, so a form regression
   fails 02 rather than failing all nine of these as well
   ───────────────────────────────────────────────────────────────────────── */

const CARDS = [
  ['Capital of France?', 'Paris'],
  ['Capital of Japan?', 'Tokyo'],
  ['Capital of Peru?', 'Lima'],
  ['Capital of Kenya?', 'Nairobi'],
] as const;

test.describe('Study games', () => {

  /* Seeded rather than built, since 02 proves the form and this cost a minute a test */
  test.beforeEach(async ({ page, request, home }) => {
    await seedAccountWithDeck(page, request, {
      name: 'Geography',
      description: 'Capitals of the world',
      flashcards: CARDS.map(([question, answer]) => ({ question, answer })),
    });
    await page.goto('/home');

    await home.select('Geography');
    await home.continueButton().click();
    await expect(page.locator('.game-item')).toHaveCount(3);
  });

  /* ── Menu ───────────────────────────────────────────────────────────────── */
  test('the menu offers all three modes, each described well enough to choose from', async ({ page }) => {
    const names = await page.locator('.game-item-info h3').allTextContents();
    expect(names).toEqual(expect.arrayContaining(['FlashFlip', 'FlashChoice', 'FlashMatch']));

    for (const blurb of await page.locator('.game-item-info p').allTextContents()) {
      expect(blurb.length).toBeGreaterThan(40);
    }
  });

  /* ── FlashFlip: self-paced review ───────────────────────────────────────── */
  test.describe('FlashFlip', () => {

    test.beforeEach(async ({ page }) => {
      await page.locator('.game-item', { hasText: 'FlashFlip' }).getByRole('link', { name: /play/i }).click();
    });

    test('a card flips to its answer and back', async ({ page }) => {
      const card = page.locator('.ff-flip-card');
      await expect(page.locator('.ff-flip-card-inner')).not.toHaveClass(/flipped/);

      await card.click();
      await expect(page.locator('.ff-flip-card-inner')).toHaveClass(/flipped/);

      await card.click();
      await expect(page.locator('.ff-flip-card-inner')).not.toHaveClass(/flipped/);
    });

    test('the deck can be walked forwards and back, and the counter follows', async ({ page }) => {
      await expect(page.locator('.card-counter')).toContainText('1');
      await page.locator('.prev-next .button').last().click();
      await expect(page.locator('.card-counter')).toContainText('2');
      await page.locator('.prev-next .button').first().click();
      await expect(page.locator('.card-counter')).toContainText('1');
    });

    test('moving to another card shows its question rather than the last answer', async ({ page }) => {
      await page.locator('.ff-flip-card').click();
      await expect(page.locator('.ff-flip-card-inner')).toHaveClass(/flipped/);

      await page.locator('.prev-next .button').last().click();
      await expect(page.locator('.ff-flip-card-inner')).not.toHaveClass(/flipped/);
    });
  });

  /* ── FlashChoice: recognition ───────────────────────────────────────────── */
  test.describe('FlashChoice', () => {

    test.beforeEach(async ({ page }) => {
      await page.locator('.game-item', { hasText: 'FlashChoice' }).getByRole('link', { name: /play/i }).click();
    });

    test('the board shows one card per flashcard and a score starting at zero', async ({ page }) => {
      await expect(page.locator('.flashcard')).toHaveCount(CARDS.length);
      await expect(page.locator('.choicematch')).toContainText('0');
    });

    test('choosing the right option scores the card and marks it answered', async ({ page }) => {
      await page.locator('.flashcard', { hasText: 'Capital of France?' }).click();

      const overlay = page.locator('.choice-overlay');
      await expect(overlay).toBeVisible();
      await expect(overlay).toContainText('Capital of France?');
      await expect(overlay.locator('.option')).toHaveCount(3);

      await overlay.locator('.option', { hasText: 'Paris' }).click();

      /* The score itself, rather than merely that the line is still on the page */
      await expect(page.locator('.choicematch')).toContainText('1 / 4');
      await expect(page.locator('.flashcard', { hasText: 'Capital of France?' }))
        .toHaveClass(/answered-correct/);
    });
  });

  /* ── FlashMatch: recall under pairing ───────────────────────────────────── */
  test.describe('FlashMatch', () => {

    test.beforeEach(async ({ page }) => {
      await page.locator('.game-item', { hasText: 'FlashMatch' }).getByRole('link', { name: /play/i }).click();
    });

    test('both columns are dealt and the totals start at zero', async ({ page }) => {
      await expect(page.locator('.fm-col')).toHaveCount(2);
      await expect(page.locator('.matchhead')).toContainText('0');
    });

    test('a correct pair is removed from both columns', async ({ page }) => {
      const question = page.locator('.fm-col').first().locator('.flashcard', { hasText: 'Capital of France?' });
      await question.click();
      await expect(page.locator('.fm-prompt')).toContainText('France');

      await page.locator('.fm-col').last().locator('.flashcard', { hasText: 'Paris' }).click();
      await expect(page.locator('.flashcard', { hasText: 'Capital of France?' })).toHaveCount(0);
      await expect(page.locator('.flashcard', { hasText: 'Paris' })).toHaveCount(0);
    });

    test('a wrong pair is counted as a mistake and both cards stay in play', async ({ page }) => {
      await page.locator('.fm-col').first().locator('.flashcard', { hasText: 'Capital of France?' }).click();
      await page.locator('.fm-col').last().locator('.flashcard', { hasText: 'Tokyo' }).click();

      await expect(page.locator('.matchhead')).toContainText(/mistake/i);
      await expect(page.locator('.flashcard', { hasText: 'Capital of France?' })).toHaveCount(1);
    });

    test('a selection can be released without guessing', async ({ page }) => {
      await page.locator('.fm-col').first().locator('.flashcard').first().click();
      await expect(page.locator('.fm-return')).toBeVisible();

      await page.locator('.fm-return').click();
      await expect(page.locator('.selected-q')).toHaveCount(0);
    });
  });

  /* ── Navigation out ─────────────────────────────────────────────────────── */
  test('the back control returns from a game to the menu', async ({ page }) => {
    await page.locator('.game-item', { hasText: 'FlashFlip' }).getByRole('link', { name: /play/i }).click();
    await page.locator('.back-link.page-back').click();
    await expect(page.locator('.game-item')).toHaveCount(3);
  });
});
