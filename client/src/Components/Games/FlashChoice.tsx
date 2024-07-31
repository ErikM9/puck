import React, { useState } from 'react';
import { Deck } from '../CreateDecks/types';
import { Link } from 'react-router-dom';

interface FlashChoiceProps {
  selectedDecks: Deck[];
}

const FlashChoice: React.FC<FlashChoiceProps> = ({ selectedDecks }) => {
  const [selectedFlashcard, setSelectedFlashcard] = useState<{ question: string; answer: string } | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [message, setMessage] = useState<string>('');
  const [correctMatch, setCorrectMatch] = useState<number>(0); 

  const getRandom = (correctAnswer: string, allAnswers: string[]) => {
    const options = [correctAnswer];
    while (options.length < 3) {
      const randomAnswer = allAnswers[Math.floor(Math.random() * allAnswers.length)];
      if (!options.includes(randomAnswer)) {
        options.push(randomAnswer);
      }
    }
    return options.sort(() => Math.random() - 0.5);
  };

  const handleFlashcardClick = (flashcard: { question: string; answer: string }) => {
    const allAnswers: string[] = selectedDecks.reduce<string[]>((allAnswers, deck) => {
      return [...allAnswers, ...deck.flashcards.map((card) => card.answer)];
    }, []);

    const randomOptions = getRandom(flashcard.answer, allAnswers);
    setSelectedFlashcard(flashcard);
    setOptions(randomOptions);
    setMessage('');
  };

  const handleOptionClick = (selectedOption: string) => {
    if (selectedOption === selectedFlashcard!.answer) {
      setMessage('Correct!');
      setCorrectMatch((prevMatches) => prevMatches + 1); 
    } else {
      setMessage('Incorrect!');
    }
    setSelectedFlashcard(null);
  };

  const renderFlashcards = () => {
    const allFlashcards: { question: string; answer: string }[] = selectedDecks.reduce((allFlashcards, deck) => {
      return [...allFlashcards, ...deck.flashcards];
    }, [] as { question: string; answer: string }[]);

    return allFlashcards.map((flashcard, index) => (
      <div key={index} onClick={() => handleFlashcardClick(flashcard)} className="flashcard">
        {flashcard.question}
      </div>
    ));
  };

  const renderOptions = () => {
    return options.map((option, index) => (
      <div key={index} onClick={() => handleOptionClick(option)} className="option">
        {option}
      </div>
    ));
  };

  return (
    <div className="flash-choice">
      <h2 className="fhead">FlashChoice Game</h2>
      <div className='flashcards-container'>
        {selectedFlashcard ? renderOptions() : renderFlashcards()}
      </div>
      {message && <p>{message}</p>}
      <p className="choicematch">Correct Matches: {correctMatch}</p>
      <Link to="/game-menu" className="back-to-menu-link button">Back to Game Menu</Link>
    </div>
  );
};

export default FlashChoice;


