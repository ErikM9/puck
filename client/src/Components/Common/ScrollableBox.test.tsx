import { render, fireEvent, screen } from '@testing-library/react';
import ScrollableBox from './ScrollableBox';

/* ── ScrollableBox ───────────────────────────────────────────────────────────
   The overlay scrollbar's geometry and pointer handling, with the layout jsdom cannot do
   stubbed and a scroll event standing in for what drives a recalculation
   ───────────────────────────────────────────────────────────────────────── */

/* jsdom performs no layout, so the geometry is mocked and a scroll event drives recalc */
const setupGeometry = (
  container: HTMLElement,
  { scrollHeight = 400, clientHeight = 200, trackHeight = 192 } = {}
) => {
  const inner = container.querySelector('.csb-inner') as HTMLElement;
  const track = screen.getByText('▼').previousElementSibling as HTMLElement;
  const thumb = track.firstElementChild as HTMLElement;
  const wrapper = screen.getByText('▲').parentElement as HTMLElement;

  Object.defineProperty(inner, 'scrollHeight', { configurable: true, value: scrollHeight });
  Object.defineProperty(inner, 'clientHeight', { configurable: true, value: clientHeight });
  let scrollTop = 0;
  Object.defineProperty(inner, 'scrollTop', {
    configurable: true,
    get: () => scrollTop,
    set: v => { scrollTop = v; },
  });
  Object.defineProperty(track, 'clientHeight', { configurable: true, value: trackHeight });

  fireEvent.scroll(inner);
  return { inner, track, thumb, wrapper };
};

const renderBox = () =>
  render(
    <ScrollableBox className="probe">
      <div>content</div>
    </ScrollableBox>
  );

describe('ScrollableBox', () => {
  it('keeps the scrollbar hidden while content fits, shows it when it overflows', () => {
    const { container } = renderBox();
    const wrapper = screen.getByText('▲').parentElement as HTMLElement;

    expect(wrapper.style.visibility).toBe('hidden');

    setupGeometry(container, { scrollHeight: 400, clientHeight: 200 });
    expect(wrapper.style.visibility).toBe('visible');
  });

  it('sizes the thumb proportionally to the visible fraction, with a 20px floor', () => {
    const { container } = renderBox();
    const { inner, thumb } = setupGeometry(container);

    expect(thumb.style.height).toBe('96px');
    expect(thumb.style.top).toBe('0px');

    Object.defineProperty(inner, 'scrollHeight', { configurable: true, value: 20000 });
    fireEvent.scroll(inner);
    expect(thumb.style.height).toBe('20px');
  });

  it('dragging the thumb scrolls proportionally, clamps, and shields the page', () => {
    const { container } = renderBox();
    const { inner, thumb } = setupGeometry(container);

    fireEvent.mouseDown(thumb, { clientY: 50 });
    const shield = container.querySelector('div[style*="fixed"]') as HTMLElement;
    expect(shield).toBeInTheDocument();

    fireEvent.mouseMove(document, { clientY: 98 });
    expect(inner.scrollTop).toBe(100);

    fireEvent.mouseMove(document, { clientY: 1000 });
    expect(inner.scrollTop).toBe(200);

    fireEvent.mouseUp(document);
    expect(container.querySelector('div[style*="fixed"]')).not.toBeInTheDocument();
  });

  it('a drag that outlives the box does not leave its listeners on the document', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');
    const { container, unmount } = renderBox();
    const { thumb } = setupGeometry(container);

    fireEvent.mouseDown(thumb, { clientY: 50 });
    const attached = add.mock.calls.filter(([type]) => type === 'mousemove' || type === 'mouseup').length;
    expect(attached).toBe(2);

    unmount();

    const detached = remove.mock.calls.filter(([type]) => type === 'mousemove' || type === 'mouseup').length;
    expect(detached).toBe(2);
    add.mockRestore();
    remove.mockRestore();
  });

  it('the arrows nudge the scroll position by 40px and clamp at both ends', () => {
    const { container } = renderBox();
    const { inner } = setupGeometry(container);

    fireEvent.mouseDown(screen.getByText('▼'));
    expect(inner.scrollTop).toBe(40);

    fireEvent.mouseDown(screen.getByText('▲'));
    fireEvent.mouseDown(screen.getByText('▲'));
    expect(inner.scrollTop).toBe(0);

    inner.scrollTop = 180;
    fireEvent.mouseDown(screen.getByText('▼'));
    expect(inner.scrollTop).toBe(200);
  });
});
