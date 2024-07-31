import React, { useState, useEffect } from 'react';
import { Deck } from '../CreateDecks/types';
import { Link } from 'react-router-dom';

interface FlashMatchProps {
  selectedDecks: Deck[];
}

const FlashMatch: React.FC<FlashMatchProps> = ({ selectedDecks }) => {
  const [matchedPairs, setMatchedPairs] = useState<number>(0);
  const [selectedQuestions, setSelectedQuestions] = useState<{ question: string; answer: string }[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [message, setMessage] = useState<string>('');
  const [shuffledAnswers, setShuffledAnswers] = useState<string[]>([]);

  useEffect(() => {
    const allAnswers = selectedDecks.reduce((answers: string[], deck) => {
      return [...answers, ...deck.flashcards.map(card => card.answer)];
    }, []);
    const shuffled = [...allAnswers].sort(() => Math.random() - 0.5);
    setShuffledAnswers(shuffled);
  }, [selectedDecks]); 

  const handleQuestionClick = (selectedQuestion: { question: string; answer: string }) => {
    if (selectedAnswers.length === 2) {
      return;
    }

    setSelectedQuestions([selectedQuestion]);

    if (selectedAnswers.length === 1) {
      const selectedAnswer = selectedAnswers[0];
      if (selectedAnswer.answer === selectedQuestion.answer) {
        setMessage('Correct!');
        setMatchedPairs(matchedPairs + 1);
        setTimeout(() => {
          setSelectedQuestions([]);
          setSelectedAnswers([]);
          setMessage('');
        }, 1000);
      } else {
        setMessage('Incorrect!');
        setTimeout(() => {
          setSelectedQuestions([]);
          setSelectedAnswers([]);
          setMessage('');
        }, 1000);
      }
    }
  };

  const handleAnswerClick = (selectedAnswer: { question: string; answer: string }) => {
    if (selectedQuestions.length === 2) {
      return;
    }

    setSelectedAnswers([selectedAnswer]);

    if (selectedQuestions.length === 1) {
      const selectedQuestion = selectedQuestions[0];
      if (selectedAnswer.answer === selectedQuestion.answer) {
        setMessage('Correct!');
        setMatchedPairs(matchedPairs + 1);
        setTimeout(() => {
          setSelectedQuestions([]);
          setSelectedAnswers([]);
          setMessage('');
        }, 1000);
      } else {
        setMessage('Incorrect!');
        setTimeout(() => {
          setSelectedQuestions([]);
          setSelectedAnswers([]);
          setMessage('');
        }, 1000);
      }
    }
  };

  const renderQuestions = () => {
    const allFlashcards = selectedDecks.reduce((allFlashcards: { question: string; answer: string }[], deck) => {
      return [...allFlashcards, ...deck.flashcards];
    }, []);

    return allFlashcards.map((flashcard, index) => (
      <React.Fragment key={index}>
        {/* Front side (Question) */}
        <div className={`flashcard ${selectedQuestions.some(q => q.answer === flashcard.answer) ? 'selected' : ''}`} onClick={() => handleQuestionClick(flashcard)}>
          <div className="question">{flashcard.question}</div>
        </div>
      </React.Fragment>
    ));
  };

  const renderAnswers = () => {
    return shuffledAnswers.map((answer, index) => (
      <React.Fragment key={index}>
        {/* Back side (Answer) */}
        <div className={`flashcard ${selectedAnswers.some(a => a.answer === answer) ? 'selected' : ''}`} onClick={() => handleAnswerClick({ question: '', answer })}>
          <div className="answer">{answer}</div>
        </div>
      </React.Fragment>
    ));
  };

  return (
    <div className="flash-match">
      <h2 className="fhead">FlashMatch Game</h2>
      <div className="fm-flashcard-container">
        <div className="questions-container">
          <h3 className="qhead">Questions:</h3>
          {renderQuestions()}
        </div>
        <div className="answers-container">
          <h3 className="ahead">Answers:</h3>
          {renderAnswers()}
        </div>
      </div>
      {message && <p className="fm-message">{message}</p>}
      <p className="matchhead">Matched pairs: {matchedPairs}</p>
      <Link to="/game-menu" className="back-to-menu-link button">Back to Game Menu</Link>
    </div>
  );
};

export default FlashMatch;

