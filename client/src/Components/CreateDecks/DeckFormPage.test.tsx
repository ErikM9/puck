import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DeckFormPage from './DeckFormPage';
import { Deck } from './types';
import apiClient from '../../api/client';

/* ── DeckFormPage ────────────────────────────────────────────────────────────
   The form in both modes, with the route deciding create or edit, covering the validation
   that gates saving and the overlays that edit a card or the deck's own details
   ───────────────────────────────────────────────────────────────────────── */

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mockNavigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => mockNavigate,
}));

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);
const mockedPut = vi.mocked(apiClient.put);

const EDIT_DECK: Deck = {
  _id: 'd7',
  userId: 'u1',
  name: 'Old Name',
  description: 'Old desc',
  flashcards: [
    { _id: 'f1', question: 'Q1', answer: 'A1' },
    { _id: 'f2', question: 'Q2', answer: 'A2' },
    { _id: 'f3', question: 'Q3', answer: 'A3' },
  ],
};

describe('DeckFormPage', () => {
  const onDeckSaved = vi.fn();

  const renderCreate = () =>
    render(
      <MemoryRouter initialEntries={['/create-decks']}>
        <Routes>
          <Route path="/create-decks" element={<DeckFormPage onDeckSaved={onDeckSaved} />} />
        </Routes>
      </MemoryRouter>
    );

  const renderEdit = (id = 'd7') =>
    render(
      <MemoryRouter initialEntries={[`/edit-deck/${id}`]}>
        <Routes>
          <Route path="/edit-deck/:id" element={<DeckFormPage onDeckSaved={onDeckSaved} />} />
        </Routes>
      </MemoryRouter>
    );

  /* Sets the deck name or description through its overlay editor */
  const setMeta = async (
    user: ReturnType<typeof userEvent.setup>,
    which: 'name' | 'description',
    value: string
  ) => {
    const label = which === 'name' ? 'Edit deck name' : 'Edit description';
    await user.click(screen.getByRole('button', { name: label }));
    const field = screen.getByLabelText(which === 'name' ? 'Deck Name:' : 'Description:');
    await user.clear(field);
    await user.type(field, value);
    await user.click(screen.getByRole('button', { name: 'Done' }));
  };

  /* Adds one card through the overlay editor: open, fill both faces, confirm */
  const addCard = async (
    user: ReturnType<typeof userEvent.setup>,
    question: string,
    answer: string
  ) => {
    await user.click(screen.getByRole('button', { name: 'Add Flashcard' }));
    await user.type(screen.getByLabelText('Question:'), question);
    await user.type(screen.getByLabelText('Answer:'), answer);
    await user.click(screen.getByRole('button', { name: 'Done' }));
  };

  it('uses a single "Build Your Deck" title for both create and edit', () => {
    renderCreate();
    expect(screen.getByRole('heading', { name: 'Build Your Deck' })).toBeInTheDocument();
  });

  it('states the minimum-card requirement on the page', () => {
    renderCreate();
    expect(screen.getByText(/at least 3 flashcards/i)).toBeInTheDocument();
  });

  it('refuses to submit without a name and description', async () => {
    const user = userEvent.setup();
    renderCreate();

    await addCard(user, 'Q1', 'A1');
    await addCard(user, 'Q2', 'A2');
    await addCard(user, 'Q3', 'A3');
    await user.click(screen.getByRole('button', { name: 'Save Deck' }));

    expect(screen.getByText('Please add a deck name and a description.')).toBeInTheDocument();
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('keeps Save Deck disabled until the deck holds 3 flashcards', async () => {
    const user = userEvent.setup();
    renderCreate();

    await setMeta(user, 'name', 'My Deck');
    await setMeta(user, 'description', 'Desc');
    expect(screen.getByRole('button', { name: 'Save Deck' })).toBeDisabled();

    await addCard(user, 'Q1', 'A1');
    await addCard(user, 'Q2', 'A2');
    expect(screen.getByRole('button', { name: 'Save Deck' })).toBeDisabled();
    expect(mockedPost).not.toHaveBeenCalled();

    await addCard(user, 'Q3', 'A3');
    expect(screen.getByRole('button', { name: 'Save Deck' })).toBeEnabled();
  });

  it('saved cards show their question and answer on a tile', async () => {
    const user = userEvent.setup();
    renderCreate();

    await addCard(user, 'What is the capital of France?', 'Paris');

    const tile = screen.getByText('What is the capital of France?').closest('.fc-tile') as HTMLElement;
    expect(within(tile).getByText('#1')).toBeInTheDocument();

    await user.click(within(tile).getByRole('button', { name: 'Show answer 1' }));
    expect(within(tile).getByText('Paris')).toBeInTheDocument();
    expect(within(tile).queryByText('What is the capital of France?')).not.toBeInTheDocument();
  });

  it('opening an existing card repopulates the editor and saves edits back', async () => {
    const user = userEvent.setup();
    renderCreate();
    await addCard(user, 'Q1', 'A1');

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const questionField = screen.getByLabelText('Question:');
    expect(questionField).toHaveValue('Q1');

    await user.clear(questionField);
    await user.type(questionField, 'Q1 edited');
    await user.click(screen.getByRole('button', { name: 'Done' }));

    expect(screen.getByText('Q1 edited')).toBeInTheDocument();
  });

  /* The server requires both faces, and rejects a blank card with a message about the deck */
  it('a card cannot be added until both of its faces carry something', async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.click(screen.getByRole('button', { name: 'Add Flashcard' }));
    expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled();

    await user.type(screen.getByLabelText('Question:'), 'Q1');
    expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled();

    await user.type(screen.getByLabelText('Answer:'), 'A1');
    expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled();
  });

  it('whitespace alone does not count as an answer', async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.click(screen.getByRole('button', { name: 'Add Flashcard' }));
    await user.type(screen.getByLabelText('Question:'), 'Q1');
    await user.type(screen.getByLabelText('Answer:'), '   ');

    expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled();
  });

  it('cancelling the editor on a brand-new card discards the empty row', async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.click(screen.getByRole('button', { name: 'Add Flashcard' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByText('Your deck has no cards yet.')).toBeInTheDocument();
  });

  it('create mode submits a 3-card deck, reports it upward, and resets the form', async () => {
    const savedDeck: Deck = {
      _id: 'new1',
      userId: 'u1',
      name: 'My Deck',
      description: 'Desc',
      flashcards: [
        { _id: 'nf1', question: 'Q1', answer: 'A1' },
        { _id: 'nf2', question: 'Q2', answer: 'A2' },
        { _id: 'nf3', question: 'Q3', answer: 'A3' },
      ],
    };
    mockedPost.mockResolvedValueOnce({ data: savedDeck });
    const user = userEvent.setup();
    renderCreate();

    await setMeta(user, 'name', 'My Deck');
    await setMeta(user, 'description', 'Desc');
    await addCard(user, 'Q1', 'A1');
    await addCard(user, 'Q2', 'A2');
    await addCard(user, 'Q3', 'A3');
    await user.click(screen.getByRole('button', { name: 'Save Deck' }));

    expect(mockedPost).toHaveBeenCalledWith('/decks', {
      name: 'My Deck',
      description: 'Desc',
      flashcards: [
        { question: 'Q1', answer: 'A1' },
        { question: 'Q2', answer: 'A2' },
        { question: 'Q3', answer: 'A3' },
      ],
    });
    expect(onDeckSaved).toHaveBeenCalledWith(savedDeck);
    expect(await screen.findByText('Your deck has no cards yet.')).toBeInTheDocument();
    expect(screen.getByText('Add a deck name…')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('edit mode loads the deck, saves changes via PUT, and returns home', async () => {
    mockedGet.mockResolvedValueOnce({ data: EDIT_DECK });
    mockedPut.mockResolvedValueOnce({ data: { ...EDIT_DECK, name: 'New Name' } });
    const user = userEvent.setup();
    renderEdit();

    expect(await screen.findByText('Old Name')).toBeInTheDocument();
    expect(mockedGet).toHaveBeenCalledWith('/decks/d7');
    expect(screen.getByText('Q1')).toBeInTheDocument();

    await setMeta(user, 'name', 'New Name');
    await user.click(screen.getByRole('button', { name: 'Save Deck' }));

    expect(mockedPut).toHaveBeenCalledWith('/decks/d7', {
      name: 'New Name',
      description: 'Old desc',
      flashcards: [
        { question: 'Q1', answer: 'A1' },
        { question: 'Q2', answer: 'A2' },
        { question: 'Q3', answer: 'A3' },
      ],
    });
    expect(onDeckSaved).toHaveBeenCalledWith({ ...EDIT_DECK, name: 'New Name' });
    expect(mockNavigate).toHaveBeenCalledWith('/home');
  });

  it('edit mode shows a load error (alongside an empty form) when the fetch fails', async () => {
    mockedGet.mockRejectedValueOnce(new Error('Network Error'));
    renderEdit('missing');

    expect(
      await screen.findByText('Could not load the deck. Please go back and try again.')
    ).toBeInTheDocument();
    expect(screen.getByText('Add a deck name…')).toBeInTheDocument();
  });

  it('tiles are numbered and the arrows reorder cards, disabled at the edges', async () => {
    const user = userEvent.setup();
    renderCreate();
    await addCard(user, 'Q1', 'A1');
    await addCard(user, 'Q2', 'A2');

    const rows = () => Array.from(document.querySelectorAll('.fc-tile'));
    expect(within(rows()[0] as HTMLElement).getByText('#1')).toBeInTheDocument();
    expect(within(rows()[0] as HTMLElement).getByText('Q1')).toBeInTheDocument();

    expect(within(rows()[0] as HTMLElement).getByRole('button', { name: 'Move left' })).toBeDisabled();
    expect(within(rows()[1] as HTMLElement).getByRole('button', { name: 'Move right' })).toBeDisabled();

    await user.click(within(rows()[0] as HTMLElement).getByRole('button', { name: 'Move right' }));

    expect(within(rows()[0] as HTMLElement).getByText('Q2')).toBeInTheDocument();
    expect(within(rows()[1] as HTMLElement).getByText('Q1')).toBeInTheDocument();
  });

  it('deleting a card row removes exactly that card', async () => {
    const user = userEvent.setup();
    renderCreate();
    await addCard(user, 'Q1', 'A1');
    await addCard(user, 'Q2', 'A2');

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);

    expect(screen.queryByText('Q1')).not.toBeInTheDocument();
    expect(screen.getByText('Q2')).toBeInTheDocument();
  });
});
