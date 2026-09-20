import React, { useState, useRef } from 'react';
import { Deck } from '../CreateDecks/types';
import { Link } from 'react-router-dom';
import FitText from '../Common/FitText';
import { fillRows, useRowCapacity, shuffle } from '../Common/rowLayout';

interface FlashChoiceProps {
  selectedDecks: Deck[];
}

/* Every card on the board at once, each answered through a three-option overlay */
const FlashChoice: React.FC<FlashChoiceProps> = ({ selectedDecks }) => {
  const allFlashcards = selectedDecks.flatMap(deck => deck.flashcards);

  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [options, setOptions]           = useState<string[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  /* Keyed by card id and holding whether it was right, which is what colours the tile */
  const [answered, setAnswered]         = useState<Map<string, boolean>>(new Map());

  /* Measured on the page root, whose width does not itself depend on the rows inside it */
  const pageRef = useRef<HTMLDivElement>(null);
  const rowCapacity = useRowCapacity(pageRef, 132, 12, 16);

  const isComplete = answered.size === allFlashcards.length && allFlashcards.length > 0;

  if (allFlashcards.length === 0) {
    return (
      <div className="flash-choice">
        <h2 className="page-heading">FlashChoice</h2>
        <p>No flashcards available. Please select a deck from the home page.</p>
        <Link to="/home" className="back-link">Back to Home</Link>
      </div>
    );
  }

  /* Two wrong answers borrowed from other cards, shuffled in with the right one */
  const buildOptions = (correctAnswer: string): string[] => {
    const pool = [...new Set(allFlashcards.map(fc => fc.answer).filter(a => a !== correctAnswer))];
    const distractors = shuffle(pool).slice(0, Math.min(2, pool.length));
    return shuffle([...distractors, correctAnswer]);
  };

  const handleFlashcardClick = (cardId: string, answer: string) => {
    if (answered.has(cardId)) return;
    setActiveCardId(cardId);
    setOptions(buildOptions(answer));
  };

  const handleOptionClick = (selectedOption: string) => {
    const activeCard = allFlashcards.find(fc => fc._id === activeCardId);
    if (!activeCard) return;
    const isCorrect = selectedOption === activeCard.answer;
    if (isCorrect) setCorrectCount(prev => prev + 1);
    setAnswered(prev => new Map([...prev, [activeCard._id, isCorrect]]));
    setActiveCardId(null);
  };

  const handleRestart = () => {
    setActiveCardId(null);
    setOptions([]);
    setCorrectCount(0);
    setAnswered(new Map());
  };

  const activeCard = allFlashcards.find(fc => fc._id === activeCardId) ?? null;

  return (
    <div className="flash-choice" ref={pageRef}>
      <Link to="/game-menu" className="back-link page-back">Back to Game Menu</Link>
      <h2 className="page-heading">FlashChoice</h2>
      {!isComplete && (
        <div className="game-topline">
          <p className="choicematch">Correct: {correctCount} / {allFlashcards.length}</p>
        </div>
      )}
      <div className="game-stage">
        <div className="stage-above" />
        {isComplete ? (
          <div className="completion">
            <div className="completion-score">{correctCount} / {allFlashcards.length}</div>
            <p>Round complete!</p>
            <button onClick={handleRestart} className="button">Play Again</button>
          </div>
        ) : (
          <div className="flashcard-grid">
            {fillRows(allFlashcards, rowCapacity).map((row, rowIndex) => (
              <div className="card-row" key={rowIndex}>
                {row.map(flashcard => {
                  const result = answered.get(flashcard._id);
                  const cls = result === undefined
                    ? 'flashcard'
                    : result ? 'flashcard answered-correct' : 'flashcard answered-wrong';
                  return (
                    <div
                      key={flashcard._id}
                      onClick={() => handleFlashcardClick(flashcard._id, flashcard.answer)}
                      className={cls}
                    >
                      <FitText className="card-text" max={20} min={6} centreBox basePad={3} clampToBox>{flashcard.question}</FitText>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        <div className="stage-below" />
      </div>

      {/* The picked question and its options sit above the board rather than replacing it */}
      {activeCard && (
        <div className="fc-overlay" onClick={() => setActiveCardId(null)}>
          <div className="choice-overlay" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="back-link" onClick={() => setActiveCardId(null)}>
              Return to questions
            </button>
            <p className="choice-overlay-q">Question: <strong>{activeCard.question}</strong></p>
            <div className="fc-options-row">
              {options.map(option => (
                <div key={option} onClick={() => handleOptionClick(option)} className="option">
                  <FitText className="card-text" max={20} min={6} centreBox basePad={3} clampToBox>{option}</FitText>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlashChoice;
