import { useRef } from 'react';
import { act, render, screen } from '@testing-library/react';
import { fillRows, useRowCapacity, shuffle } from './rowLayout';

/* ── rowLayout ───────────────────────────────────────────────────────────────
   The pure row helper, the shuffle, and the hook that reads the card width out of the CSS
   ───────────────────────────────────────────────────────────────────────── */

/* Reads the count out of a real render, since useRowCapacity measures a live element */
const Probe = ({ cardWidth = 132, gap = 12, padding = 0, cssCardWidth = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const capacity = useRowCapacity(ref, cardWidth, gap, padding);
  const style = cssCardWidth ? ({ '--card-w': cssCardWidth } as React.CSSProperties) : undefined;
  return <div ref={ref} style={style} data-testid="box">{capacity}</div>;
};

/* jsdom performs no layout, so clientWidth is stubbed onto the prototype for the render */
const withWidth = (width: number, run: () => void) => {
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => width });
  try {
    run();
  } finally {
    if (original) Object.defineProperty(HTMLElement.prototype, 'clientWidth', original);
  }
};

describe('fillRows', () => {
  const sizes = (rows: unknown[][]) => rows.map(row => row.length);
  const items = (n: number) => Array.from({ length: n }, (_, i) => i);

  it('returns nothing for an empty list', () => {
    expect(fillRows([], 5)).toEqual([]);
  });

  it('keeps everything on one row while it fits', () => {
    expect(sizes(fillRows(items(4), 5))).toEqual([4]);
    expect(sizes(fillRows(items(5), 5))).toEqual([5]);
  });

  it('fills each row to capacity before starting the next', () => {
    expect(sizes(fillRows(items(7), 5))).toEqual([5, 2]);
    expect(sizes(fillRows(items(10), 9))).toEqual([9, 1]);
    expect(sizes(fillRows(items(12), 5))).toEqual([5, 5, 2]);
  });

  it('leaves only the final row short', () => {
    for (let n = 1; n <= 40; n += 1) {
      for (let cap = 1; cap <= 9; cap += 1) {
        const rows = fillRows(items(n), cap);
        for (const row of rows.slice(0, -1)) expect(row).toHaveLength(cap);
        expect(rows[rows.length - 1].length).toBeGreaterThan(0);
      }
    }
  });

  it('never exceeds the capacity it was given', () => {
    for (let n = 1; n <= 40; n += 1) {
      for (let cap = 1; cap <= 9; cap += 1) {
        expect(Math.max(...fillRows(items(n), cap).map(r => r.length))).toBeLessThanOrEqual(cap);
      }
    }
  });

  it('preserves every item and its order', () => {
    const source = items(17);
    expect(fillRows(source, 5).flat()).toEqual(source);
  });

  it('treats a zero or negative capacity as one per row', () => {
    expect(sizes(fillRows(items(3), 0))).toEqual([1, 1, 1]);
    expect(sizes(fillRows(items(3), -4))).toEqual([1, 1, 1]);
  });
});

describe('shuffle', () => {
  const items = (n: number) => Array.from({ length: n }, (_, i) => i);

  it('returns every item exactly once, and a new array', () => {
    const source = items(20);
    const result = shuffle(source);

    expect(result).not.toBe(source);
    expect([...result].sort((a, b) => a - b)).toEqual(source);
    expect(source).toEqual(items(20));
  });

  it('handles the empty and single-item cases', () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle(['only'])).toEqual(['only']);
  });

  it('actually moves things, which a sort on a random comparator cannot promise', () => {
    /* Pinned to zero, Fisher-Yates gives a defined result rather than an arbitrary one */
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(shuffle(['a', 'b', 'c'])).toEqual(['b', 'c', 'a']);
    random.mockRestore();
  });
});

describe('useRowCapacity', () => {
  it('counts how many cards fit, allowing for the gaps between them', () => {
    /* 708px holds five 132px cards plus four 12px gaps, and cannot hold a sixth */
    withWidth(708, () => {
      render(<Probe />);
      expect(screen.getByTestId('box')).toHaveTextContent('5');
    });
  });

  it('subtracts the container padding before measuring', () => {
    withWidth(300, () => {
      render(<Probe padding={100} />);
      /* 300 - 100 leaves room for one card, not two */
      expect(screen.getByTestId('box')).toHaveTextContent('1');
    });
  });

  it('prefers a card width declared in CSS over the value passed in', () => {
    /* 708px holds five 132px cards, but ten of the 60px the stylesheet asks for */
    withWidth(708, () => {
      render(<Probe cssCardWidth="60px" />);
      expect(screen.getByTestId('box')).toHaveTextContent('10');
    });
  });

  it('falls back to the passed width when the property is absent or unusable', () => {
    withWidth(708, () => {
      render(<Probe cssCardWidth="auto" />);
      expect(screen.getByTestId('box')).toHaveTextContent('5');
    });
  });

  it('never reports less than one card, however narrow the container', () => {
    withWidth(0, () => {
      render(<Probe />);
      expect(screen.getByTestId('box')).toHaveTextContent('1');
    });
  });

  it('re-measures when its own container resizes, with the window untouched', () => {
    let width = 300;
    const observers: Array<() => void> = [];
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => width });
    const realRO = globalThis.ResizeObserver;
    /* Captures the callback, as a real observer fires when one column hides */
    globalThis.ResizeObserver = class {
      constructor(cb: () => void) { observers.push(cb); }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as never;

    try {
      render(<Probe />);
      expect(screen.getByTestId('box')).toHaveTextContent('2');

      width = 1000;
      act(() => { observers.forEach(cb => cb()); });
      expect(screen.getByTestId('box')).toHaveTextContent('7');
    } finally {
      globalThis.ResizeObserver = realRO;
      if (original) Object.defineProperty(HTMLElement.prototype, 'clientWidth', original);
    }
  });

  it('re-measures when the window resizes', () => {
    let width = 300;
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => width });
    try {
      render(<Probe />);
      expect(screen.getByTestId('box')).toHaveTextContent('2');

      width = 1000;
      act(() => { window.dispatchEvent(new Event('resize')); });
      expect(screen.getByTestId('box')).toHaveTextContent('7');
    } finally {
      if (original) Object.defineProperty(HTMLElement.prototype, 'clientWidth', original);
    }
  });
});
