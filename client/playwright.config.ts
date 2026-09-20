import { defineConfig, devices } from '@playwright/test';

/* One browser locally and all three on CI, since three is 114 tests for the same answers */
const everyBrowser = !!process.env.CI || !!process.env.E2E_ALL_BROWSERS;

/* Its own ports, so a development stack on 5173 and 5000 can keep running alongside a
   test run rather than having to be shut down for one */
const CLIENT_PORT = 5174;
const API_PORT = 5001;

/* Drives a real browser, covering the seams the jsdom component tests cannot reach */
export default defineConfig({
  testDir: './e2e',
  /* Each test mints its own account and builds its own decks, so none depends on another */
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],

  /* Building a deck is two dozen interactions against a cloud database while another worker
     competes for it, so the budget is set for the heaviest journey rather than the lightest */
  timeout: 90_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${CLIENT_PORT}`,
    /* retain-on-failure rather than on-first-retry: retries are zero locally, so a trace
       was never written for the run you actually need to look at */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: everyBrowser
    ? [
        { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox-desktop', use: { ...devices['Desktop Firefox'] } },
        /* A phone profile as well, because so much of this layout depends on the viewport */
        { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
      ]
    : [{ name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } }],

  webServer: [
    {
      /* --mode e2e picks up .env.e2e, which points the app at the API below */
      command: `npm run dev -- --mode e2e --port ${CLIENT_PORT} --strictPort`,
      url: `http://localhost:${CLIENT_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      /* node directly rather than npm start: on Windows npm spawns a shell which spawns
         node, and killing the shell can leave the grandchild holding the port */
      command: 'node index.js',
      cwd: '../server',
      url: `http://localhost:${API_PORT}/health`,
      /* Never reused, because everything below has to apply and a server someone else
         started would not have it */
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        PORT: String(API_PORT),
        /* The browser is served from the port above, and CORS has to agree */
        CLIENT_ORIGIN: `http://localhost:${CLIENT_PORT}`,
        /* The suite would otherwise exhaust the production cap of 20 partway through */
        AUTH_RATE_LIMIT_MAX: '1000',
        /* Deliberate silence rather than absent credentials, so it is not reported as a fault */
        EMAIL_DISABLED: '1',
      },
    },
  ],
});
