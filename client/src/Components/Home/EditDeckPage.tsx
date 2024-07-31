import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';

interface Flashcard {
  question: string;
  answer: string;
}

interface Deck {
  id: string;
  name: string;
  description: string;
  flashcards: Flashcard[];
}

const EditDeckPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeck = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_KEY}/decks/${id}`);
        const deckData = response.data;
        setDeck(deckData);
        setName(deckData.name);
        setDescription(deckData.description);
        setFlashcards(deckData.flashcards);
      } catch (error) {
        console.error('Error fetching deck:', error);
      }
    };

    if (id) {
      fetchDeck();
    }
  }, [id]);

  const handleUpdateDeck = async () => {
    if (flashcards.length < 3) {
      setError('Please include AT LEAST 3 flashcards in your deck.');
      return;
    }

    try {
      const updatedDeck = { name, description, flashcards };
      await axios.put(`${import.meta.env.VITE_API_KEY}/decks/${id}`, updatedDeck);
      window.location.href = '/'; // Force a full page reload to refresh HomePage
    } catch (error) {
      console.error('An error occurred while updating the deck', error);
      setError('An error occurred while updating the deck. Please try again.');
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

  if (!deck) {
    return <div>Loading...</div>;
  }

  return (
    <div className="edit-deck-page create-deck-page">
      <form onSubmit={(e) => { e.preventDefault(); handleUpdateDeck(); }}>
        <div className="form-group">
          <h2 className="fhead">Edit Deck</h2>
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
        <div className="form-group">
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
              <button type="button" className="delete-flashcard" onClick={() => handleDeleteFlashcard(index)}>
                Delete
              </button>
            </div>
          ))}
          </div>
          <button type="button" className="create-btn" onClick={handleAddFlashcard}>
            Add Flashcard
          </button>
          <button type="submit" className="create-btn">Save Changes</button>
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

export default EditDeckPage;
