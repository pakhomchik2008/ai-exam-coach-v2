import "@testing-library/jest-dom/vitest";

/**
 * jsdom ships no `matchMedia`, and several legacy modules call it during render
 * to check `prefers-reduced-motion`. Without a stub they throw before any
 * assertion runs.
 */
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
