import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FlashChoice from './FlashChoice';
import { Deck } from '../CreateDecks/types';

/* ── FlashChoice ─────────────────────────────────────────────────────────────
   Every card on the board at once, covering scoring, the states a card is left in, and a deck
   too small to offer three distinct options
   ───────────────────────────────────────────────────────────────────────── */

const DECKS: Deck[] = [
  {
    _id: 'd1', userId: 'u1', name: 'Deck', description: 'desc',
    flashcards: [
      { _id: 'f1', question: 'Q1', answer: 'A1' },
      { _id: 'f2', question: 'Q2', answer: 'A2' },
      { _id: 'f3', question: 'Q3', answer: 'A3' },
      { _id: 'f4', question: 'Q4', answer: 'A4' },
    ],
  },
];

const renderGame = (decks: Deck[] = DECKS) =>
  render(<MemoryRouter><FlashChoice selectedDecks={decks} /></MemoryRouter>);

const options = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('.option')) as HTMLElement[];

/* Answers the card for `question` either correctly or with the first wrong option */
const answerCard = (container: HTMLElement, question: string, correctly: boolean) => {
  fireEvent.click(screen.getByText(question));
  const answer = `A${question.slice(1)}`;
  const target = correctly
    ? options(container).find(o => o.textContent === answer)!
    : options(container).find(o => o.textContent !== answer)!;
  fireEvent.click(target);
};

/* jsdom reports every width as zero, so the measured width is stubbed to exercise the split */
const withContainerWidth = (width: number, run: () => void) => {
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => width });
  try {
    run();
  } finally {
    if (original) Object.defineProperty(HTMLElement.prototype, 'clientWidth', original);
  }
};

describe('FlashChoice', () => {
  it('shows the empty-state hint when no decks are selected', () => {
    renderGame([]);
    expect(
      screen.getByText('No flashcards available. Please select a deck from the home page.')
    ).toBeInTheDocument();
  });

  it('renders every question as a card in the grid', () => {
    const { container } = renderGame();
    expect(container.querySelectorAll('.flashcard-grid .flashcard')).toHaveLength(4);
    expect(screen.getByText('Correct: 0 / 4')).toBeInTheDocument();
  });

  it('splits the board into balanced rows that respect the measured width', () => {
    /* 300px of grid holds two 132px cards, so four cards make two rows of two */
    withContainerWidth(300, () => {
      const { container } = renderGame();

      const rows = container.querySelectorAll('.flashcard-grid .card-row');
      expect(rows).toHaveLength(2);
      for (const row of rows) {
        expect(row.querySelectorAll('.flashcard')).toHaveLength(2);
      }
    });
  });

  it('leaves any shorter row at the bottom', () => {
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

      const counts = Array.from(container.querySelectorAll('.card-row')).map(
        row => row.querySelectorAll('.flashcard').length
      );
      expect(counts).toEqual([2, 1]);
    });
  });

  it('offers fewer options when the deck cannot supply three distinct answers', () => {
    const { container } = renderGame([
      {
        _id: 'd1', userId: 'u1', name: 'Tiny', description: 'desc',
        flashcards: [
          { _id: 'f1', question: 'Q1', answer: 'A1' },
          { _id: 'f2', question: 'Q2', answer: 'A2' },
        ],
      },
    ]);

    fireEvent.click(screen.getByText('Q1'));

    const shown = options(container);
    expect(shown).toHaveLength(2);
    expect(shown.map(o => o.textContent)).toContain('A1');
  });

  it('clicking the overlay backdrop closes it without scoring', () => {
    const { container } = renderGame();

    fireEvent.click(screen.getByText('Q1'));
    fireEvent.click(container.querySelector('.fc-overlay') as HTMLElement);

    expect(options(container)).toHaveLength(0);
    expect(screen.getByText('Correct: 0 / 4')).toBeInTheDocument();
  });

  it('clicking a card opens the options overlay; the grid stays mounted behind it', () => {
    const { container } = renderGame();

    fireEvent.click(screen.getByText('Q2'));

    const shown = options(container);
    expect(shown).toHaveLength(3);
    expect(shown.map(o => o.textContent)).toContain('A2');
    expect(container.querySelector('.choice-overlay-q')).toHaveTextContent('Q2');
    expect(screen.getByRole('button', { name: 'Return to questions' })).toBeInTheDocument();
    expect(container.querySelector('.flashcard-grid')).toBeInTheDocument();
  });

  it('"Return to questions" closes the overlay without scoring', () => {
    const { container } = renderGame();

    fireEvent.click(screen.getByText('Q1'));
    fireEvent.click(screen.getByRole('button', { name: 'Return to questions' }));

    expect(options(container)).toHaveLength(0);
    expect(screen.getByText('Correct: 0 / 4')).toBeInTheDocument();
    expect(screen.getByText('Q1').closest('.flashcard')).not.toHaveClass('answered-correct');
  });

  it('a correct pick scores the card, marks it green, and locks it', () => {
    const { container } = renderGame();

    answerCard(container, 'Q1', true);

    expect(screen.getByText('Correct: 1 / 4')).toBeInTheDocument();
    const card = screen.getByText('Q1').closest('.flashcard') as HTMLElement;
    expect(card).toHaveClass('answered-correct');

    fireEvent.click(card);
    expect(options(container)).toHaveLength(0);
  });

  it('a wrong pick marks the card red with no retry and no score', () => {
    const { container } = renderGame();

    answerCard(container, 'Q2', false);

    expect(screen.getByText('Correct: 0 / 4')).toBeInTheDocument();
    const card = screen.getByText('Q2').closest('.flashcard') as HTMLElement;
    expect(card).toHaveClass('answered-wrong');

    fireEvent.click(card);
    expect(options(container)).toHaveLength(0);
  });

  it('answering every card completes the round and Play Again resets it', () => {
    const { container } = renderGame();

    answerCard(container, 'Q1', false);
    answerCard(container, 'Q2', true);
    answerCard(container, 'Q3', true);
    answerCard(container, 'Q4', true);

    expect(screen.getByText('3 / 4')).toBeInTheDocument();
    expect(screen.getByText('Round complete!')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Play Again' }));
    expect(container.querySelectorAll('.flashcard-grid .flashcard')).toHaveLength(4);
    expect(screen.getByText('Correct: 0 / 4')).toBeInTheDocument();
  });
});
