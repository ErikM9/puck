import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Deck } from '../CreateDecks/types';

interface HomePageProps {
  decks: Deck[];
  onSelectDeck: (deckName: string) => void;
  selectedDecks: string[];
  setDecks: React.Dispatch<React.SetStateAction<Deck[]>>;
  setSelectedDecks: React.Dispatch<React.SetStateAction<string[]>>; // Add this line
}

const HomePage: React.FC<HomePageProps> = ({ decks, onSelectDeck, selectedDecks, setDecks, setSelectedDecks }) => {
  const navigate = useNavigate();

  const handleSelectDeck = (deckName: string) => {
    onSelectDeck(deckName);
  };

  const handleDeleteDeck = async (deckId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_KEY}/decks/${deckId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDecks(prevDecks => prevDecks.filter(deck => deck._id !== deckId));
        setSelectedDecks(prevSelectedDecks => prevSelectedDecks.filter(deckName => decks.find(deck => deck._id === deckId)?.name !== deckName)); // Add this line
      } else {
        alert('Failed to delete the deck');
      }
    } catch (error) {
      console.error('Error deleting deck:', error);
      alert('An error occurred while deleting the deck');
    }
  };

  const handleUpdateDeck = (deckId: string) => {
    navigate(`/edit-deck/${deckId}`);
  };

  const handleContinue = () => {
    if (selectedDecks.length === 0) {
      alert('Select at least ONE deck');
    } else {
      navigate('/game-menu');
    }
  };

  return (
    <div className="home-page">
      <h2 className="fhead">Home Page</h2>
      <p className="home-desc">Click on the decks you wish to select and continue to the Game Menu.</p>
      <div className="deck-list">
        {decks.map((deck) => (
          <div
            key={deck._id}
            className={`deck-item ${selectedDecks.includes(deck.name) ? 'selected' : ''}`}
            onClick={() => handleSelectDeck(deck.name)}
          >
            <h3>{deck.name}</h3>
            <p>{deck.description}</p>
            <p>Number of Flashcards: {deck.flashcards.length}</p>
            <button
              className="delete-btn-deck"
              onClick={(e) => { e.stopPropagation(); handleDeleteDeck(deck._id); }}
            >
              Delete
            </button>
            <button
              className="update-btn-deck"
              onClick={(e) => { e.stopPropagation(); handleUpdateDeck(deck._id); }}
            >
              View
            </button>
          </div>
        ))}
      </div>
      <div className="actions">
        <div className='buttons'>
          <Link to="/create-decks" className="home-btn button">Create Decks</Link>
          <button onClick={handleContinue} className="home-btn button">Continue</button>
        </div>
        <p className="total-flashcards">
          Total Flashcards: {selectedDecks.reduce((total, name) => total + (decks.find(deck => deck.name === name)?.flashcards.length || 0), 0)}
        </p>
      </div>
    </div>
  );
};

export default HomePage;
export type { HomePageProps };

