import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Deck } from '../CreateDecks/types';
import FitText from '../Common/FitText';
import apiClient from '../../api/client';
import ScrollableBox from '../Common/ScrollableBox';

interface HomePageProps {
  decks: Deck[];
  onSelectDeck: (deckId: string) => void;
  selectedDecks: string[];
  setDecks: React.Dispatch<React.SetStateAction<Deck[]>>;
  setSelectedDecks: React.Dispatch<React.SetStateAction<string[]>>;
}

/* The deck table, where decks are picked for a game and created, edited or deleted */
const HomePage: React.FC<HomePageProps> = ({ decks, onSelectDeck, selectedDecks, setDecks, setSelectedDecks }) => {
  const navigate = useNavigate();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  /* Dropped from the selection as well as the list, or a game could open on nothing */
  const handleDeleteDeck = async (deckId: string) => {
    setDeleteError(null);
    try {
      await apiClient.delete(`/decks/${deckId}`);
      setDecks(prev => prev.filter(deck => deck._id !== deckId));
      setSelectedDecks(prev => prev.filter(id => id !== deckId));
    } catch (error) {
      console.error('Error deleting deck:', error);
      setDeleteError('Failed to delete the deck. Please try again.');
    }
  };

  const handleContinue = () => {
    if (selectedDecks.length === 0) return;
    navigate('/game-menu');
  };

  /* Totals the cards across every picked deck, shown under the buttons */
  const totalSelectedFlashcards = decks
    .filter(deck => selectedDecks.includes(deck._id))
    .reduce((total, deck) => total + deck.flashcards.length, 0);

  return (
    <div className="home-page">
      <h2 className="page-heading">Home</h2>
      <p className="home-desc">Select one or more decks, then continue to the Game Menu.</p>
      {deleteError && <p className="error-message">{deleteError}</p>}
      <ScrollableBox
        className="deck-list"
        outerClassName="deck-list-outer"
        outerStyle={{ width: 'calc(118px * 5 + 14px * 4 + 32px)', margin: '0 auto 24px' }}
        sbRight={6}
      >
        {/* Stands in for the grid until the first deck exists */}
        {decks.length === 0 && (
          <div className="flashcard-empty-state">
            <p>You have no decks yet.</p>
            <p>Use <strong>Create Deck</strong> below to build your first set of flashcards.</p>
          </div>
        )}
        {decks.map((deck) => (
          <div
            key={deck._id}
            className={`deck-item ${selectedDecks.includes(deck._id) ? 'selected' : ''}`}
            onClick={() => onSelectDeck(deck._id)}
          >
            <h3><FitText className="deck-title-text" axis="width" max={11.5} min={7.5}>{deck.name}</FitText></h3>
            <FitText className="deck-desc" max={25} min={7} centreBox basePad={1}>{deck.description}</FitText>
            <p className="deck-card-count">
              {deck.flashcards.length} card{deck.flashcards.length !== 1 ? 's' : ''}
            </p>
            <div className="deck-item-actions" onClick={e => e.stopPropagation()}>
              <button
                className="update-btn-deck"
                onClick={() => navigate(`/edit-deck/${deck._id}`)}
              >
                <FitText className="mini-btn-label" axis="width" max={12.5} min={7}>Edit</FitText>
              </button>
              <button
                className="delete-btn-deck"
                onClick={() => handleDeleteDeck(deck._id)}
              >
                <FitText className="mini-btn-label" axis="width" max={10.5} min={7}>Delete</FitText>
              </button>
            </div>
          </div>
        ))}
      </ScrollableBox>
      <div className="actions">
        <div className="buttons">
          <Link to="/create-decks" className="button"><FitText className="page-btn-label" axis="width" max={17} min={10}>Create Deck</FitText></Link>
          <button
            onClick={handleContinue}
            className="button"
            disabled={selectedDecks.length === 0}
            title={selectedDecks.length === 0 ? 'Select at least one deck' : ''}
          >
            <FitText className="page-btn-label" axis="width" max={20} min={10}>Continue</FitText>
          </button>
        </div>
        <p className="total-flashcards">
          {selectedDecks.length > 0
            ? `${totalSelectedFlashcards} flashcard${totalSelectedFlashcards !== 1 ? 's' : ''} selected`
            : '\u00A0'}
        </p>
      </div>
    </div>
  );
};

export default HomePage;
export type { HomePageProps };