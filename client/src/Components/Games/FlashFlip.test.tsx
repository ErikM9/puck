import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FlashFlip from './FlashFlip';
import { Deck } from '../CreateDecks/types';

/* ── FlashFlip ───────────────────────────────────────────────────────────────
   One card at a time, so these follow the flip, the counter, and the wrap-around at each end
   ───────────────────────────────────────────────────────────────────────── */

const DECKS: Deck[] = [
  {
    _id: 'd1',
    userId: 'u1',
    name: 'Deck',
    description: 'desc',
    flashcards: [
      { _id: 'f1', question: 'Q1', answer: 'A1' },
      { _id: 'f2', question: 'Q2', answer: 'A2' },
      { _id: 'f3', question: 'Q3', answer: 'A3' },
    ],
  },
];

const renderGame = (decks: Deck[] = DECKS) =>
  render(
    <MemoryRouter>
      <FlashFlip selectedDecks={decks} />
    </MemoryRouter>
  );

const flipCard = (container: HTMLElement) =>
  container.querySelector('.ff-flip-card') as HTMLElement;
const flipInner = (container: HTMLElement) =>
  container.querySelector('.ff-flip-card-inner') as HTMLElement;

/* One card at a time, so the tests follow the counter, the flip state, and the wrap-around */
describe('FlashFlip', () => {
  it('shows the empty-state hint when no decks are selected', () => {
    renderGame([]);
    expect(
      screen.getByText('No flashcards available. Please select a deck from the home page.')
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Home' })).toHaveAttribute('href', '/home');
  });

  it('starts on the first question with the counter and flip hint', () => {
    renderGame();
    expect(screen.getByText('Q1')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByText('Tap to reveal the answer')).toBeInTheDocument();
  });

  it('clicking the card toggles the flip state and the hint', () => {
    const { container } = renderGame();

    fireEvent.click(flipCard(container));
    expect(flipInner(container)).toHaveClass('flipped');
    expect(screen.getByText('Tap to see the question')).toBeInTheDocument();

    fireEvent.click(flipCard(container));
    expect(flipInner(container)).not.toHaveClass('flipped');
    expect(screen.getByText('Tap to reveal the answer')).toBeInTheDocument();
  });

  it('draws its cards from every selected deck at once', () => {
    renderGame([
      DECKS[0],
      {
        _id: 'd2', userId: 'u1', name: 'Second', description: 'desc',
        flashcards: [{ _id: 'f4', question: 'Q4', answer: 'A4' }],
      },
    ]);

    expect(screen.getByText('1 / 4')).toBeInTheDocument();
  });

  it('a single-card deck wraps around to itself in both directions', () => {
    renderGame([
      {
        _id: 'd1', userId: 'u1', name: 'Solo', description: 'desc',
        flashcards: [{ _id: 'f1', question: 'Only', answer: 'A' }],
      },
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('1 / 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Prev' }));
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
    expect(screen.getByText('Only')).toBeInTheDocument();
  });

  it('Next and Previous navigate, wrap around, and reset the flip', () => {
    const { container } = renderGame();

    /* Flip first: the card that arrives must be face-down again */
    fireEvent.click(flipCard(container));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Q2')).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    expect(flipInner(container)).not.toHaveClass('flipped');

    fireEvent.click(screen.getByRole('button', { name: 'Prev' }));
    fireEvent.click(screen.getByRole('button', { name: 'Prev' }));
    expect(screen.getByText('Q3')).toBeInTheDocument();
    expect(screen.getByText('3 / 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Q1')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });
});
