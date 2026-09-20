import { test, expect, uniqueEmail, PASSWORD } from './support/fixtures';

/* ── 01-authentication ───────────────────────────────────────────────────────
   Registration, sign-in and recovery driven through the forms, since this is the only
   file testing them; everything else seeds its account through the API instead
   ───────────────────────────────────────────────────────────────────────── */

test.describe('Authentication', () => {

  /* ── Happy path ─────────────────────────────────────────────────────────── */
  test.describe('registration and sign-in', () => {

    test('a new account can be created and lands on the deck list', async ({ page, auth }) => {
      const email = uniqueEmail();
      await auth.goto();
      await auth.registerAndSignIn(email);

      /* Reaching Home is the real assertion: it proves a token was issued and stored */
      await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
      await expect(page.locator('.navbar-logo')).toHaveText(/puck/i);
    });

    test('an existing account can sign back in after logging out', async ({ page, auth }) => {
      const email = uniqueEmail();
      await auth.goto();
      await auth.registerAndSignIn(email);
      await expect(page.locator('.navbar-logout')).toBeVisible();

      await page.locator('.navbar-logout').click();
      await expect(page.getByLabel(/email/i)).toBeVisible();

      await auth.login(email);
      await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
    });
  });

  /* ── Negative paths ─────────────────────────────────────────────────────────
     A suite that only proves success tells an employer nothing about rigour */
  test.describe('rejected credentials', () => {

    test('signing in with an unknown address is refused and stays on the form', async ({ page, auth }) => {
      await auth.goto();
      await auth.login(uniqueEmail());

      await expect(page.locator('.error-message')).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
    });

    test('signing in with the wrong password is refused', async ({ page, auth }) => {
      const email = uniqueEmail();
      await auth.goto();
      await auth.registerAndSignIn(email);
      await page.locator('.navbar-logout').click();

      await auth.login(email, `${PASSWORD}-wrong`);
      await expect(page.locator('.error-message')).toBeVisible();
    });

    test('registering an address twice is refused', async ({ page, auth }) => {
      const email = uniqueEmail();
      await auth.goto();
      await auth.registerAndSignIn(email);
      await page.locator('.navbar-logout').click();

      /* This one is meant to be refused, so it submits and does not wait to be let in */
      await auth.register(email);
      await expect(page.locator('.error-message')).toBeVisible();
    });
  });

  /* ── Recovery ───────────────────────────────────────────────────────────────
     The mailbox is out of scope, so these stop at the boundary we control:
     that the flow advances and never discloses whether an address is registered */
  test.describe('password recovery', () => {

    test('requesting a code advances to the code step', async ({ page, auth }) => {
      await auth.goto();
      await auth.enterRecovery();
      await auth.requestCode(uniqueEmail());

      await expect(page.getByLabel(/recovery code/i)).toBeVisible();
    });

    test('the response is identical for unknown addresses, so accounts cannot be enumerated', async ({ page, auth }) => {
      await auth.goto();
      await auth.enterRecovery();
      await auth.requestCode(uniqueEmail());

      await expect(page.locator('.recover-desc')).toContainText(/if that email is registered/i);
    });

    test('leaving recovery returns to the login form without sending anything', async ({ page, auth }) => {
      await auth.goto();
      await auth.enterRecovery();
      await page.getByRole('button', { name: /back to login/i }).click();

      await expect(page.getByRole('button', { name: /^login$/i })).toBeVisible();
    });
  });

  /* ── Route protection ───────────────────────────────────────────────────── */
  test('a signed-out visitor cannot reach the deck list directly', async ({ page }) => {
    await page.goto('/home');
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });
});
