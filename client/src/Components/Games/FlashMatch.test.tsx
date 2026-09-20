import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FlashMatch from './FlashMatch';
import { Deck } from '../CreateDecks/types';

/* ── FlashMatch ──────────────────────────────────────────────────────────────
   The board's states are nothing picked, a question picked and a pair resolved, so these walk
   every move between them, with a group for the duplicate-answer defect
   ───────────────────────────────────────────────────────────────────────── */

const DECKS: Deck[] = [
  {
    _id: 'd1', userId: 'u1', name: 'Deck', description: 'desc',
    flashcards: [
      { _id: 'f1', question: 'Q1', answer: 'A1' },
      { _id: 'f2', question: 'Q2', answer: 'A2' },
    ],
  },
];

const renderGame = (decks: Deck[] = DECKS) =>
  render(<MemoryRouter><FlashMatch selectedDecks={decks} /></MemoryRouter>);

const questionCard = (text: string) =>
  screen.getByText(text, { selector: '.question' }).closest('.flashcard') as HTMLElement;
const answerCard = (text: string) =>
  screen.getByText(text, { selector: '.answer' }).closest('.flashcard') as HTMLElement;

/* jsdom reports every width as zero, so the split can only be exercised by stubbing it */
const withContainerWidth = (width: number, run: () => void) => {
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => width });
  try {
    run();
  } finally {
    if (original) Object.defineProperty(HTMLElement.prototype, 'clientWidth', original);
  }
};

/* jsdom gives every element a scrollWidth of zero, so the overflow is stubbed here */
const withOverflowingText = (run: () => void) => {
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => 999 });
  try { run(); } finally { if (original) Object.defineProperty(HTMLElement.prototype, 'scrollWidth', original); }
};

/* The totals span two elements, so the line is read whole rather than node by node */
const totals = () => document.querySelector('.matchhead')?.textContent ?? '';

describe('FlashMatch', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('shows the empty-state hint when no decks are selected', () => {
    renderGame([]);
    expect(
      screen.getByText('No flashcards available. Please select a deck from the home page.')
    ).toBeInTheDocument();
  });

  it('renders both columns at once: questions, answers (dimmed), and the counter', () => {
    const { container } = renderGame();

    expect(screen.getByText('Questions:')).toBeInTheDocument();
    expect(screen.getByText('Answers:')).toBeInTheDocument();
    expect(questionCard('Q1')).toBeInTheDocument();
    expect(questionCard('Q2')).toBeInTheDocument();
    expect(answerCard('A1')).toBeInTheDocument();
    expect(answerCard('A2')).toBeInTheDocument();
    /* Answers stay dimmed until a question is picked */
    expect(container.querySelector('.fm-awaiting')).toBeInTheDocument();
    expect(totals()).toContain('Matched:0 / 2');
  });

  it('balances each column into rows, shorter row last', () => {
    withContainerWidth(300, () => {
      const { container } = renderGame([
        {
          _id: 'd1', userId: 'u1', name: 'Deck', description: 'desc',
          flashcards: [
            { _id: 'f1', question: 'Q1', answer: 'A1' },
            { _id: 'f2', question: 'Q2', answer: 'A2' },
            { _id: 'f3', question: 'Q3', answer: 'A3' },
          ],
        },
      ]);

      /* 300px holds two 132px cards per row, so three cards split 2 + 1 in both columns */
      for (const column of container.querySelectorAll('.fm-col-cards')) {
        const counts = Array.from(column.querySelectorAll('.card-row')).map(
          row => row.querySelectorAll('.flashcard').length
        );
        expect(counts).toEqual([2, 1]);
      }
    });
  });

  it('deals every answer exactly once, in an order the shuffle decides', () => {
    /* Math.random pinned to 0 makes Fisher-Yates deterministic, which fixes the deal */
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    const { container } = renderGame([
      {
        _id: 'd1', userId: 'u1', name: 'Deck', description: 'desc',
        flashcards: [
          { _id: 'f1', question: 'Q1', answer: 'A1' },
          { _id: 'f2', question: 'Q2', answer: 'A2' },
          { _id: 'f3', question: 'Q3', answer: 'A3' },
        ],
      },
    ]);

    const answers = Array.from(container.querySelectorAll('.answer')).map(a => a.textContent);
    expect(answers).toEqual(['A2', 'A3', 'A1']);
    random.mockRestore();
  });

  it('selecting a question highlights it and shows the prompt; re-clicking deselects', () => {
    const { container } = renderGame();

    fireEvent.click(questionCard('Q1'));
    expect(questionCard('Q1')).toHaveClass('selected-q');
    expect(screen.getByText('Match:')).toBeInTheDocument();
    expect(container.querySelector('.fm-awaiting')).not.toBeInTheDocument();

    fireEvent.click(questionCard('Q1'));
    expect(questionCard('Q1')).not.toHaveClass('selected-q');
    expect(screen.queryByText('Match:')).not.toBeInTheDocument();
  });

  it('offers a way out of a pick, and only once one has been made', () => {
    renderGame();

    expect(screen.queryByRole('button', { name: 'Unsure? Pick another card' })).not.toBeInTheDocument();

    fireEvent.click(questionCard('Q1'));
    const release = screen.getByRole('button', { name: 'Unsure? Pick another card' });
    expect(release).toBeInTheDocument();

    fireEvent.click(release);
    expect(questionCard('Q1')).not.toHaveClass('selected-q');
    expect(screen.queryByText('Match:')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unsure? Pick another card' })).not.toBeInTheDocument();
  });

  /* ── The mistake counter's wording ──────────────────────────────────────── */
  it('reads N/A until a mistake is made, then shows the count', () => {
    renderGame();
    expect(totals()).toContain('Mistakes:N/A');

    fireEvent.click(questionCard('Q1'));
    fireEvent.click(answerCard('A2'));

    expect(totals()).toContain('Mistakes:1');
    expect(totals()).not.toContain('N/A');
  });

  /* ── Reading a question the card had to truncate ─────────────────────────── */
  it('offers no way to open the card while the prompt shows the question in full', () => {
    const { container } = renderGame();

    fireEvent.click(questionCard('Q1'));
    expect(container.querySelector('.fm-full-btn')).not.toBeInTheDocument();
  });

  it('offers the full question in an overlay once the prompt has been cut', () => {
    withOverflowingText(() => {
      const { container } = renderGame();

      expect(container.querySelector('.fm-full-btn')).not.toBeInTheDocument();

      fireEvent.click(questionCard('Q1'));
      const open = container.querySelector('.fm-full-btn') as HTMLElement;
      expect(open).toBeInTheDocument();

      fireEvent.click(open);
      const overlay = container.querySelector('.fm-overlay') as HTMLElement;
      expect(overlay).toBeInTheDocument();
      expect(overlay.textContent).toContain('Q1');

      fireEvent.click(container.querySelector('.fm-overlay-close') as HTMLElement);
      expect(container.querySelector('.fm-overlay')).not.toBeInTheDocument();
    });
  });

  it('the overlay closes when the backdrop is clicked, but not the card itself', () => {
    withOverflowingText(() => {
      const { container } = renderGame();

      fireEvent.click(questionCard('Q1'));
      fireEvent.click(container.querySelector('.fm-full-btn') as HTMLElement);
      expect(container.querySelector('.fm-overlay')).toBeInTheDocument();

      /* Clicking the card must not dismiss it, or the text is unreadable on touch */
      fireEvent.click(container.querySelector('.fm-overlay-card') as HTMLElement);
      expect(container.querySelector('.fm-overlay')).toBeInTheDocument();

      fireEvent.click(container.querySelector('.fm-overlay') as HTMLElement);
      expect(container.querySelector('.fm-overlay')).not.toBeInTheDocument();
    });
  });

  it('a correct answer removes the pair from both columns', () => {
    renderGame();

    fireEvent.click(questionCard('Q1'));
    fireEvent.click(answerCard('A1'));

    expect(screen.queryByText('Q1', { selector: '.question' })).not.toBeInTheDocument();
    expect(screen.queryByText('A1', { selector: '.answer' })).not.toBeInTheDocument();
    expect(totals()).toContain('Matched:1 / 2');
    expect(screen.queryByText('Match:')).not.toBeInTheDocument();
  });

  it('clicking an answer with nothing selected does nothing', () => {
    renderGame();

    fireEvent.click(answerCard('A1'));

    expect(totals()).toContain('Matched:0 / 2');
    expect(totals()).toContain('Mistakes:N/A');
    expect(answerCard('A1')).toBeInTheDocument();
  });

  it('a wrong answer flashes red, counts a mistake, then releases the selection', () => {
    vi.useFakeTimers();
    renderGame();

    fireEvent.click(questionCard('Q1'));
    fireEvent.click(answerCard('A2'));

    expect(answerCard('A2')).toHaveClass('wrong-flash');
    expect(totals()).toContain('Mistakes:1');

    act(() => { vi.advanceTimersByTime(700); });

    expect(questionCard('Q1')).not.toHaveClass('selected-q');
    expect(answerCard('A2')).not.toHaveClass('wrong-flash');
    expect(totals()).toContain('Matched:0 / 2');
  });

  /* Two cards answering alike used to empty the board without ever completing */
  describe('a deck where two cards share an answer', () => {
    const DUPES: Deck[] = [
      {
        _id: 'd1', userId: 'u1', name: 'Dupes', description: 'desc',
        flashcards: [
          { _id: 'f1', question: 'Capital of France?', answer: 'Paris' },
          { _id: 'f2', question: 'Where is the Louvre?', answer: 'Paris' },
          { _id: 'f3', question: 'Capital of Japan?', answer: 'Tokyo' },
        ],
      },
    ];

    it('retires one question and one answer per match, not every card that reads alike', () => {
      renderGame(DUPES);

      fireEvent.click(questionCard('Capital of France?'));
      fireEvent.click(screen.getAllByText('Paris', { selector: '.answer' })[0].closest('.flashcard') as HTMLElement);

      expect(screen.queryByText('Capital of France?', { selector: '.question' })).not.toBeInTheDocument();
      expect(screen.getByText('Where is the Louvre?', { selector: '.question' })).toBeInTheDocument();
      expect(screen.getAllByText('Paris', { selector: '.answer' })).toHaveLength(1);
      expect(totals()).toContain('Matched:1 / 3');
    });

    it('reaches completion, which it cannot do while pairs are counted by text', () => {
      renderGame(DUPES);

      for (const [question, answer] of [
        ['Capital of France?', 'Paris'],
        ['Where is the Louvre?', 'Paris'],
        ['Capital of Japan?', 'Tokyo'],
      ]) {
        fireEvent.click(questionCard(question));
        fireEvent.click(screen.getAllByText(answer, { selector: '.answer' })[0].closest('.flashcard') as HTMLElement);
      }

      expect(screen.getByText('3 / 3')).toBeInTheDocument();
      expect(screen.getByText(/all pairs matched/i)).toBeInTheDocument();
    });
  });

  it('leaving the board mid-flash cancels the timer rather than waking a dead component', () => {
    vi.useFakeTimers();
    const view = renderGame();

    fireEvent.click(questionCard('Q1'));
    fireEvent.click(answerCard('A2'));
    expect(vi.getTimerCount()).toBe(1);

    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('completing every pair shows the summary with mistakes; Play Again resets', () => {
    vi.useFakeTimers();
    renderGame();

    fireEvent.click(questionCard('Q1'));
    fireEvent.click(answerCard('A2'));
    act(() => { vi.advanceTimersByTime(700); });

    fireEvent.click(questionCard('Q1'));
    fireEvent.click(answerCard('A1'));
    fireEvent.click(questionCard('Q2'));
    fireEvent.click(answerCard('A2'));

    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(screen.getByText(/with 1 mistake/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Play Again' }));
    expect(totals()).toContain('Matched:0 / 2');
    expect(questionCard('Q1')).toBeInTheDocument();
  });
});
