import { RefObject, useLayoutEffect, useState } from 'react';

/* Fills each row to capacity in turn, so any remainder ends up in a shorter last row */
export function fillRows<T>(items: T[], capacity: number): T[][] {
  const cap = Math.max(1, capacity);
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += cap) rows.push(items.slice(i, i + cap));
  return rows;
}

/* Works out how many cards fit across a container that is not itself sized by the rows */
export function useRowCapacity(
  ref: RefObject<HTMLElement | null>,
  cardWidth: number,
  gap: number,
  horizontalPadding = 0
): number {
  const [capacity, setCapacity] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const declared = parseFloat(getComputedStyle(el).getPropertyValue('--card-w'));
      /* The stylesheet owns the card width, so the count follows whatever size it renders at */
      const card = Number.isFinite(declared) && declared > 0 ? declared : cardWidth;
      const width = el.clientWidth - horizontalPadding;
      setCapacity(Math.max(1, Math.floor((width + gap) / (card + gap))));
    };

    measure();

    /* A container can change width on its own, as when one FlashMatch column hides */
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    window.addEventListener('resize', measure);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [ref, cardWidth, gap, horizontalPadding]);

  return capacity;
}

/* Fisher-Yates, since sorting on a random comparator is both biased and undefined */
export function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
