import '@testing-library/jest-dom/vitest';

/* jsdom implements no ResizeObserver, which ScrollableBox observes on mount */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverStub as never);

afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});
