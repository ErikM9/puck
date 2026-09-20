import { RefObject, useLayoutEffect } from 'react';

/* How far the text may shrink, which axis it is measured on, and how it sits in its box */
export interface FitOptions {
  max?: number;
  min?: number;
  /* Lines the text is allowed to overrun by, for boxes that can afford to spill a little */
  slackLines?: number;
  centreBox?: boolean;
  basePad?: number;
  axis?: 'height' | 'width';
  /* Cuts the text and appends an ellipsis when even the smallest size will not fit */
  clampToBox?: boolean;
}

/* Binary-searches the largest size at which an element's text still fits the box CSS gave it */
export function useFitFont(
  ref: RefObject<HTMLElement | null>,
  content: string,
  options: FitOptions = {}
) {
  const {
    max = 15,
    min = 8,
    slackLines = 0,
    centreBox = false,
    axis = 'height',
    basePad = 7,
    clampToBox = false,
  } = options;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      /* Every pass starts from the same state, or a re-run inherits the last one's answer */
      el.textContent = content;
      el.style.lineHeight = '';
      el.style.removeProperty('-webkit-line-clamp');

      if (centreBox) {
        el.style.paddingTop = `${basePad}px`;
        el.style.paddingBottom = `${basePad}px`;
      }

      const fits = (size: number) => {
        if (axis === 'width') return el.scrollWidth <= el.clientWidth + 1;
        return el.scrollHeight <= el.clientHeight + 1 + size * 1.35 * slackLines;
      };

      /* Seven halvings settle a half-pixel answer across any range this app uses */
      let lo = min;
      let hi = max;
      let best = min;

      for (let i = 0; i < 7; i += 1) {
        const mid = Math.round(((lo + hi) / 2) * 2) / 2;
        el.style.fontSize = `${mid}px`;
        if (fits(mid)) {
          best = mid;
          lo = mid;
        } else {
          hi = mid;
        }
      }

      el.style.fontSize = `${best}px`;

      /* Cutting characters and measuring is exact, where line clamping varies by engine */
      if (clampToBox) {
        el.textContent = content;
        if (el.scrollHeight > el.clientHeight + 1) {
          let low = 0;
          let high = content.length;
          while (low < high) {
            const mid = Math.ceil((low + high) / 2);
            el.textContent = `${content.slice(0, mid).trimEnd()}\u2026`;
            if (el.scrollHeight <= el.clientHeight + 1) low = mid; else high = mid - 1;
          }
          el.textContent = `${content.slice(0, low).trimEnd()}\u2026`;
        }
      }

      if (centreBox) {
        /* Range.getClientRects is not everywhere, so the leading step is skipped not thrown */
        const range = document.createRange();
        range.selectNodeContents(el);
        const rects = typeof range.getClientRects === 'function' ? Array.from(range.getClientRects()) : [];
        const tops = new Set(
          rects.filter(rect => rect.width > 1).map(rect => Math.round(rect.top))
        );
        const lines = Math.max(1, tops.size);
        const room = el.clientHeight - 2 * basePad;
        const original = el.style.lineHeight;
        const leading = Math.min(1.6, room / (lines * best));
        if (leading > 1.05) {
          el.style.lineHeight = String(leading);
          if (el.scrollHeight > el.clientHeight + 1) el.style.lineHeight = original;
        }
        /* Centred by grid, since halving the leftover space relies on scrollHeight */
        el.style.display = 'grid';
        el.style.alignContent = 'center';
        el.style.paddingTop = `${basePad}px`;
        el.style.paddingBottom = `${basePad}px`;
      }
    };

    measure();

    /* One pass measures before the font loads and the zoom settles, so it runs again */
    let frame = 0;
    const remeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        observer?.disconnect();
        measure();
        if (observer) {
          if (el.parentElement) observer.observe(el.parentElement);
          observer.observe(el);
        }
      });
    };

    /* jsdom has neither, so under test the hook quietly falls back to its single pass */
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(remeasure) : null;
    if (observer) {
      if (el.parentElement) observer.observe(el.parentElement);
      observer.observe(el);
    }
    window.addEventListener('resize', remeasure);
    if (document.fonts && document.fonts.status !== 'loaded') {
      document.fonts.ready.then(remeasure).catch(() => {});
    }

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', remeasure);
    };
  }, [ref, content, max, min, slackLines, centreBox, axis, basePad, clampToBox]);
}
