import React, { useState } from 'react';
import axios from 'axios';
import { Deck } from './types'; 
import { Link } from 'react-router-dom';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_KEY,
});

interface CreateDecksPageProps {
  onDeckCreated: (newDeck: Deck) => void;
}

const CreateDecksPage: React.FC<CreateDecksPageProps> = ({ onDeckCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [flashcards, setFlashcards] = useState([{ question: '', answer: '' }]);
  const [error, setError] = useState<string | null>(null);

  const handleCreateDeck = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (flashcards.length < 3) {
      setError('Please include AT LEAST 3 flashcards in your deck.');
      return;
    }

    try {
      const deckResponse = await api.post('/decks', { name, description, flashcards });
      const newDeck: Deck = deckResponse.data;

      onDeckCreated(newDeck);
      setName('');
      setDescription('');
      setFlashcards([{ question: '', answer: '' }]); // Reset form after creation
      setError(null);
    } catch (error) {
      console.error('Error creating deck:', error);
      setError('Error creating deck. Please try again.');
    }
  };

  const handleAddFlashcard = () => {
    setFlashcards([...flashcards, { question: '', answer: '' }]);
  };

  const handleQuestionChange = (index: number, value: string) => {
    const updatedFlashcards = [...flashcards];
    updatedFlashcards[index].question = value;
    setFlashcards(updatedFlashcards);
  };

  const handleAnswerChange = (index: number, value: string) => {
    const updatedFlashcards = [...flashcards];
    updatedFlashcards[index].answer = value;
    setFlashcards(updatedFlashcards);
  };

  const handleDeleteFlashcard = (index: number) => {
    const updatedFlashcards = flashcards.filter((_, i) => i !== index);
    setFlashcards(updatedFlashcards);
  };

  return (
    <div className="create-deck-page">
      <form onSubmit={handleCreateDeck}>
        <div className="form-group">
        <div>
          <h2 className="fhead">Create Deck</h2>
          <h3>Deck</h3>
          <label>
            Deck Name:
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
        </div>
        <div>
          <label>
            Description:
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </label>
        </div>
        </div>
        <div>
          <h3>Flashcards</h3>
          <div className="flashcards-container">
          {flashcards.map((flashcard, index) => (
            <div key={index}>
              <label className="qa">
                Question: 
                <input
                  type="text"
                  value={flashcard.question}
                  onChange={(e) => handleQuestionChange(index, e.target.value)}
                  required
                />
              </label>
              <label className="qa">
                Answer: 
                <input
                  type="text"
                  value={flashcard.answer}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  required
                />
              </label>
              <button type="button" className='delete-flashcard' onClick={() => handleDeleteFlashcard(index)}>
                Delete
              </button>
            </div>
          ))}
          </div>
          <button type="button" className="create-btn" onClick={handleAddFlashcard}>
            Add Flashcard
          </button>
          <button type="submit" className="create-btn">Create Deck</button>
          {error && <p className="error-message">{error}</p>}
        </div>
      </form>
      <div className="page-links">
        <Link to="/" className="back-to-home-link button">
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default CreateDecksPage;






