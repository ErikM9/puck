import { render, screen } from '@testing-library/react';
import FitText from './FitText';

/* ── FitText ─────────────────────────────────────────────────────────────────
   The hook that decides how large text may be, with jsdom performing no layout, so the
   geometry it measures against is stubbed throughout
   ───────────────────────────────────────────────────────────────────────── */

/* jsdom performs no layout, so these stub the geometry the hook measures itself against */
const GEOMETRY = ['scrollHeight', 'clientHeight', 'scrollWidth', 'clientWidth'] as const;

const withGeometry = (
  values: Partial<Record<(typeof GEOMETRY)[number], number | (() => number)>>,
  run: () => void
) => {
  const originals = GEOMETRY.map(key => [key, Object.getOwnPropertyDescriptor(HTMLElement.prototype, key)] as const);
  for (const key of GEOMETRY) {
    const value = values[key] ?? 0;
    Object.defineProperty(HTMLElement.prototype, key, {
      configurable: true,
      get: typeof value === 'function' ? value : () => value,
    });
  }
  try {
    run();
  } finally {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(HTMLElement.prototype, key, descriptor);
    }
  }
};

const fontSizeOf = (text: string) => parseFloat(screen.getByText(text).style.fontSize);

describe('FitText', () => {
  it('renders its text and always ends up with an explicit size', () => {
    withGeometry({}, () => {
      render(<FitText max={15} min={8}>Hello</FitText>);
      expect(screen.getByText('Hello')).toBeInTheDocument();
      expect(fontSizeOf('Hello')).toBeGreaterThan(0);
    });
  });

  it('keeps the ceiling when the content already fits', () => {
    withGeometry({ scrollHeight: 40, clientHeight: 100 }, () => {
      render(<FitText max={15} min={8}>Roomy</FitText>);
      expect(fontSizeOf('Roomy')).toBe(15);
    });
  });

  it('falls back to the floor when nothing fits', () => {
    withGeometry({ scrollHeight: 900, clientHeight: 10 }, () => {
      render(<FitText max={15} min={8}>Overflowing</FitText>);
      expect(fontSizeOf('Overflowing')).toBe(8);
    });
  });

  it('settles between the two when only smaller sizes fit', () => {
    /* Height scales with the size being tried, so the search must converge rather than clamp */
    let current = 15;
    const element = () => screen.getByText('Middling');
    withGeometry(
      {
        clientHeight: 100,
        scrollHeight: () => {
          const size = parseFloat(element().style.fontSize || '15');
          current = size;
          return size * 9;
        },
      },
      () => {
        render(<FitText max={15} min={8}>Middling</FitText>);
        const result = fontSizeOf('Middling');
        expect(result).toBeGreaterThanOrEqual(8);
        expect(result).toBeLessThan(15);
        expect(current).toBeGreaterThan(0);
      }
    );
  });

  it('resolves in half-pixel steps', () => {
    withGeometry({ scrollHeight: 40, clientHeight: 100 }, () => {
      render(<FitText max={13.5} min={8}>Halves</FitText>);
      expect(fontSizeOf('Halves') % 0.5).toBe(0);
    });
  });

  it('measures width instead of height when asked to', () => {
    /* Height would fit comfortably; only the width axis reports an overflow */
    withGeometry({ scrollHeight: 10, clientHeight: 100, scrollWidth: 900, clientWidth: 10 }, () => {
      render(<FitText axis="width" max={15} min={8}>Wide label</FitText>);
      expect(fontSizeOf('Wide label')).toBe(8);
    });
  });

  it('centres its text in the box, with equal padding at either end', () => {
    withGeometry({ scrollHeight: 40, clientHeight: 100 }, () => {
      render(<FitText centreBox basePad={7} max={15} min={8}>Centred</FitText>);
      const style = screen.getByText('Centred').style;
      /* The browser does the centring, since halving the leftover space relied on scrollHeight */
      expect(style.display).toBe('grid');
      expect(style.alignContent).toBe('center');
      expect(style.paddingTop).toBe(style.paddingBottom);
      expect(parseFloat(style.paddingTop)).toBeGreaterThanOrEqual(7);
    });
  });

  it('leaves layout alone when it is not asked to centre', () => {
    withGeometry({ scrollHeight: 40, clientHeight: 100 }, () => {
      render(<FitText max={15} min={8}>Plainly placed</FitText>);
      expect(screen.getByText('Plainly placed').style.display).toBe('');
    });
  });

  it('forwards a title, so text the box had to shrink can still be read in full', () => {
    withGeometry({}, () => {
      render(<FitText max={15} min={8} title="The whole question, untrimmed">Trimmed</FitText>);
      expect(screen.getByTitle('The whole question, untrimmed')).toHaveTextContent('Trimmed');
    });
  });

  it('sets no title attribute when none is given', () => {
    withGeometry({}, () => {
      render(<FitText max={15} min={8}>Plain</FitText>);
      expect(screen.getByText('Plain')).not.toHaveAttribute('title');
    });
  });

  /* ── Clamping to the box ───────────────────────────────────────────────────
     The fitter truncates only when the smallest size still does not fit, and it
     finds the cut by measuring rather than by counting lines
     ─────────────────────────────────────────────────────────────────────── */
  describe('clampToBox', () => {
    /* height grows with the text, so the binary search over characters converges */
    const proportional = (perCharacter: number) => ({
      clientHeight: 40,
      scrollHeight: () => {
        const element = document.querySelector('.probe');
        return ((element?.textContent?.length ?? 0) * perCharacter);
      },
    });

    it('leaves the text alone when it already fits', () => {
      withGeometry(proportional(0.1), () => {
        render(<FitText className="probe" clampToBox max={15} min={8}>Short enough</FitText>);
        expect(screen.getByText('Short enough')).toBeInTheDocument();
      });
    });

    it('cuts the text and ends it with an ellipsis when the floor still overflows', () => {
      withGeometry(proportional(4), () => {
        const { container } = render(
          <FitText className="probe" clampToBox max={15} min={8}>
            A question far longer than the box it has been given can ever show
          </FitText>
        );
        const text = (container.firstChild as HTMLElement).textContent ?? '';
        expect(text.endsWith('\u2026')).toBe(true);
        expect(text.length).toBeLessThan(65);
      });
    });

    it('does not truncate when the option is absent, however long the text', () => {
      withGeometry(proportional(4), () => {
        const { container } = render(
          <FitText className="probe" max={15} min={8}>
            A question far longer than the box it has been given can ever show
          </FitText>
        );
        expect((container.firstChild as HTMLElement).textContent).not.toContain('\u2026');
      });
    });
  });

  /* ── Staying correct after first paint ─────────────────────────────────────
     One pass measures before the font has loaded and before the breakpoint's
     zoom has settled, so the fit has to survive the box changing underneath it
     ─────────────────────────────────────────────────────────────────────── */
  describe('re-measuring', () => {
    it('subscribes to resize, so a later layout change is not missed', () => {
      const add = vi.spyOn(window, 'addEventListener');
      withGeometry({}, () => {
        render(<FitText className="probe" max={15} min={8}>Watched</FitText>);
      });
      expect(add).toHaveBeenCalledWith('resize', expect.any(Function));
      add.mockRestore();
    });

    it('schedules the re-measure rather than running it inline, so a burst costs one pass', () => {
      const frame = vi.spyOn(window, 'requestAnimationFrame');
      withGeometry({ clientHeight: 400, scrollHeight: 40 }, () => {
        render(<FitText className="probe" max={15} min={8}>Batched</FitText>);
        frame.mockClear();
        window.dispatchEvent(new Event('resize'));
        window.dispatchEvent(new Event('resize'));
        window.dispatchEvent(new Event('resize'));
      });
      /* three events, three schedules, but each cancels the last so only one pass runs */
      expect(frame).toHaveBeenCalledTimes(3);
      frame.mockRestore();
    });

    it('removes its resize listener when unmounted', () => {
      const remove = vi.spyOn(window, 'removeEventListener');
      withGeometry({}, () => {
        const { unmount } = render(<FitText className="probe" max={15} min={8}>Gone</FitText>);
        unmount();
      });
      expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
      remove.mockRestore();
    });
  });

  it('applies the class it is given, so CSS can still size the box', () => {
    withGeometry({}, () => {
      render(<FitText className="card-text" max={15} min={8}>Classed</FitText>);
      expect(screen.getByText('Classed')).toHaveClass('card-text');
    });
  });
});
