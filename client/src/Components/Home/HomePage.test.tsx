import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import HomePage from './HomePage';
import { Deck } from '../CreateDecks/types';
import apiClient from '../../api/client';

/* ── HomePage ────────────────────────────────────────────────────────────────
   Wrapped in a stateful harness, because the page takes its setters as props and only a real
   parent can show the outcome, covering selection, its running total, and deletion
   ───────────────────────────────────────────────────────────────────────── */

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mockNavigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => mockNavigate,
}));

const mockedDelete = vi.mocked(apiClient.delete);

const DECKS: Deck[] = [
  {
    _id: 'd1',
    userId: 'u1',
    name: 'Deck One',
    description: 'First deck',
    flashcards: [{ _id: 'f1', question: 'Q1', answer: 'A1' }],
  },
  {
    _id: 'd2',
    userId: 'u1',
    name: 'Deck Two',
    description: 'Second deck',
    flashcards: [
      { _id: 'f2', question: 'Q2', answer: 'A2' },
      { _id: 'f3', question: 'Q3', answer: 'A3' },
      { _id: 'f4', question: 'Q4', answer: 'A4' },
    ],
  },
];

/* HomePage takes its setters as props, so a stateful wrapper is needed to assert outcomes */
const Harness = ({ initialDecks }: { initialDecks: Deck[] }) => {
  const [decks, setDecks] = useState<Deck[]>(initialDecks);
  const [selectedDecks, setSelectedDecks] = useState<string[]>([]);
  const onSelectDeck = (deckId: string) =>
    setSelectedDecks(prev =>
      prev.includes(deckId) ? prev.filter(id => id !== deckId) : [...prev, deckId]
    );

  return (
    <MemoryRouter>
      <HomePage
        decks={decks}
        onSelectDeck={onSelectDeck}
        selectedDecks={selectedDecks}
        setDecks={setDecks}
        setSelectedDecks={setSelectedDecks}
      />
    </MemoryRouter>
  );
};

const deckCard = (name: string) => screen.getByText(name).closest('.deck-item') as HTMLElement;

describe('HomePage', () => {
  it('shows the empty-state hint when there are no decks', () => {
    render(<Harness initialDecks={[]} />);
    expect(screen.getByText('You have no decks yet.')).toBeInTheDocument();
    expect(screen.getByText(/build your first set of flashcards/)).toBeInTheDocument();
  });

  it('renders each deck with its description and a pluralised card count', () => {
    render(<Harness initialDecks={DECKS} />);

    expect(screen.getByText('First deck')).toBeInTheDocument();
    expect(screen.getByText('1 card')).toBeInTheDocument();
    expect(screen.getByText('3 cards')).toBeInTheDocument();
  });

  it('clicking a deck toggles selection, the flashcard total, and the Continue button', async () => {
    const user = userEvent.setup();
    render(<Harness initialDecks={DECKS} />);
    const continueButton = screen.getByRole('button', { name: 'Continue' });

    expect(continueButton).toBeDisabled();

    await user.click(deckCard('Deck Two'));
    expect(deckCard('Deck Two')).toHaveClass('selected');
    expect(screen.getByText('3 flashcards selected')).toBeInTheDocument();
    expect(continueButton).toBeEnabled();

    await user.click(deckCard('Deck One'));
    expect(screen.getByText('4 flashcards selected')).toBeInTheDocument();

    await user.click(deckCard('Deck Two'));
    expect(deckCard('Deck Two')).not.toHaveClass('selected');
    expect(screen.getByText('1 flashcard selected')).toBeInTheDocument();
  });

  it('Continue navigates to the game menu once a deck is selected', async () => {
    const user = userEvent.setup();
    render(<Harness initialDecks={DECKS} />);

    await user.click(deckCard('Deck One'));
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(mockNavigate).toHaveBeenCalledWith('/game-menu');
  });

  it('Edit navigates to the edit route without toggling deck selection', async () => {
    const user = userEvent.setup();
    render(<Harness initialDecks={DECKS} />);

    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    await user.click(editButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/edit-deck/d1');
    expect(deckCard('Deck One')).not.toHaveClass('selected');
  });

  it('Delete removes the deck from the list on success', async () => {
    mockedDelete.mockResolvedValueOnce({ data: { message: 'Deck deleted successfully' } });
    const user = userEvent.setup();
    render(<Harness initialDecks={DECKS} />);

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);

    expect(mockedDelete).toHaveBeenCalledWith('/decks/d1');
    await waitFor(() => expect(screen.queryByText('Deck One')).not.toBeInTheDocument());
    expect(screen.getByText('Deck Two')).toBeInTheDocument();
  });

  it('Delete failure keeps the deck and shows an error message', async () => {
    mockedDelete.mockRejectedValueOnce(new Error('Network Error'));
    const user = userEvent.setup();
    render(<Harness initialDecks={DECKS} />);

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);

    expect(
      await screen.findByText('Failed to delete the deck. Please try again.')
    ).toBeInTheDocument();
    expect(screen.getByText('Deck One')).toBeInTheDocument();
  });
});
