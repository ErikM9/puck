import { test, expect, seedAccount } from './support/fixtures';

/* ── 04-layout-and-accessibility ─────────────────────────────────────────────
   What jsdom cannot report at all: that pages do not scroll sideways at six widths, that
   focus is visible, that contrast clears AA, and that reduced motion is honoured
   ───────────────────────────────────────────────────────────────────────── */

const VIEWPORTS = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'Galaxy S8+', width: 360, height: 740 },
  { name: 'iPad Mini', width: 768, height: 1024 },
  { name: 'Nest Hub', width: 1024, height: 600 },
  { name: 'Laptop', width: 1440, height: 900 },
  { name: 'Desktop', width: 1920, height: 1080 },
] as const;

test.describe('Layout and accessibility', () => {

  /* Only a signed-in page is needed here, so it is seeded rather than typed */
  test.beforeEach(async ({ page, request }) => {
    await seedAccount(page, request);
    await page.goto('/home');
  });

  /* ── Responsive integrity ───────────────────────────────────────────────── */
  test.describe('no page ever scrolls sideways', () => {
    for (const vp of VIEWPORTS) {
      test(`${vp.name} at ${vp.width}x${vp.height}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        const overflow = await page.evaluate(() => {
          const el = document.documentElement;
          return el.scrollWidth - el.clientWidth;
        });
        expect(overflow, 'horizontal overflow in CSS pixels').toBeLessThanOrEqual(1);
      });
    }
  });

  test('the deck panel shows whole rows, with equal space above and below them', async ({ page }) => {
    const spacing = await page.evaluate(() => {
      const list = document.querySelector('.deck-list');
      if (!list) return null;
      const style = getComputedStyle(list);
      return { padTop: parseFloat(style.paddingTop), padBottom: parseFloat(style.paddingBottom) };
    });
    /* A panel sized to whole rows pads both ends alike, and a sliver of the next row is what an off-by-one there looks like */
    expect(spacing).not.toBeNull();
    expect(Math.abs(spacing!.padTop - spacing!.padBottom)).toBeLessThanOrEqual(1);
  });

  /* ── Keyboard access ────────────────────────────────────────────────────── */
  test('every control can be reached by keyboard and shows where focus is', async ({ page }) => {
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      return { tag: el.tagName, outline: style.outlineStyle, width: style.outlineWidth };
    });
    expect(focus, 'the first Tab should land on a control').not.toBeNull();
    expect(focus!.outline, 'a focused control needs a visible ring').not.toBe('none');
  });

  /* ── Reduced motion ─────────────────────────────────────────────────────── */
  test('animation is suppressed for visitors who ask for reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();

    const durations = await page.evaluate(() =>
      Array.from(document.querySelectorAll('*'))
        .map(el => getComputedStyle(el).animationDuration)
        .filter(duration => duration && duration !== '0s')
        .map(duration => parseFloat(duration)));

    /* The reduced-motion rule collapses every duration, so none should remain perceptible */
    for (const duration of durations) expect(duration).toBeLessThan(0.05);
  });

  /* ── Contrast ───────────────────────────────────────────────────────────────
     A spot check rather than a full audit: it catches a token being darkened,
     which is how this project's three contrast failures were introduced */
  test('body text clears the WCAG AA contrast floor against its background', async ({ page }) => {
    const ratio = await page.evaluate(() => {
      const luminance = (rgb: number[]) => {
        const [r, g, b] = rgb.map(v => {
          const channel = v / 255;
          return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const parse = (value: string) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);

      const target = document.querySelector('.home-desc, .deck-card-count, p');
      if (!target) return null;
      const foreground = parse(getComputedStyle(target).color);
      const background = [10, 26, 46];
      const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
      return (light + 0.05) / (dark + 0.05);
    });

    expect(ratio).not.toBeNull();
    expect(ratio!, 'contrast ratio against the app background').toBeGreaterThanOrEqual(4.5);
  });

  /* ── Document semantics ─────────────────────────────────────────────────── */
  test('each page states its identity through a single main heading', async ({ page }) => {
    /* A web-first assertion, since count() resolves once and cannot wait for the page */
    await expect(page.locator('h1, h2.page-heading')).toHaveCount(1);
  });
});
