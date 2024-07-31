import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Deck } from '../CreateDecks/types';

interface FlashFlipProps {
  selectedDecks: Deck[];
}

const FlashFlip: React.FC<FlashFlipProps> = ({ selectedDecks }) => {
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const flipCard = () => {
    setFlipped(!flipped);
  };

  const nextCard = () => {
    setCardIndex(prevIndex => (prevIndex === getTotalFlashcards() - 1 ? 0 : prevIndex + 1));
    setFlipped(false);
  };

  const prevCard = () => {
    setCardIndex(prevIndex => (prevIndex === 0 ? getTotalFlashcards() - 1 : prevIndex - 1));
    setFlipped(false);
  };

  const getTotalFlashcards = () => {
    return selectedDecks.reduce((total, deck) => total + deck.flashcards.length, 0);
  };

  const getCurrentFlash = () => {
    const currentIndex = cardIndex;
    let totalFlashcards = 0;

    for (const deck of selectedDecks) {
      const deckSize = deck.flashcards.length;
      if (currentIndex < totalFlashcards + deckSize) {
        return deck.flashcards[currentIndex - totalFlashcards];
      }
      totalFlashcards += deckSize;
    }

    return selectedDecks[0].flashcards[0];
  };

  return (
    <div className="flashflip">
      <h2 className="fhead">FlashFlip</h2>
      <div onClick={flipCard} className="ff-flashcard-container">
        {flipped ? <p>{getCurrentFlash().answer}</p> : <p>{getCurrentFlash().question}</p>}
      </div>
      <div className="prev-next">
      <button onClick={prevCard} className="prev-btn button">Previous</button>
      <button onClick={nextCard} className="next-btn button">Next</button>
      </div>
      <Link to="/game-menu" className="back-to-menu-link button">Back to Game Menu</Link>
    </div>
  );
};

export default FlashFlip;


