import React, { useState, useEffect, useRef } from 'react';
import { Deck } from '../CreateDecks/types';
import { Link } from 'react-router-dom';
import FitText from '../Common/FitText';
import { fillRows, useRowCapacity, shuffle } from '../Common/rowLayout';

interface FlashMatchProps {
  selectedDecks: Deck[];
}

/* Carries the id of its source card, since two cards can share one answer text */
interface AnswerCard {
  id: string;
  answer: string;
}

const FlashMatch: React.FC<FlashMatchProps> = ({ selectedDecks }) => {
  const allFlashcards = selectedDecks.flatMap(deck => deck.flashcards);

  /* Tracked by id on both sides, so one match retires one question and one answer */
  const [matchedQuestionIds, setMatchedQuestionIds] = useState<Set<string>>(new Set());
  const [matchedAnswerIds, setMatchedAnswerIds] = useState<Set<string>>(new Set());

  const [activeQuestion, setActiveQuestion] = useState<{ id: string; answer: string; question: string } | null>(null);
  const [showFull, setShowFull] = useState(false);
  const [wrongAnswerId, setWrongAnswerId] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [wrongPairs, setWrongPairs] = useState(0);
  const [shuffledAnswers, setShuffledAnswers] = useState<AnswerCard[]>([]);

  const returnRef = useRef<HTMLButtonElement>(null);
  const promptRef = useRef<HTMLParagraphElement>(null);
  /* Held so leaving the board cancels the flash rather than letting it wake a dead component */
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, []);
  const [lineWidth, setLineWidth] = useState<number | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  /* The control's line length depends on the font, so it is measured rather than assumed */
  useEffect(() => {
    const measure = () => {
      const control = returnRef.current;
      /* scrollWidth, since the rendered width is the one this effect sets */
      setLineWidth(control ? Math.ceil(control.scrollWidth) : null);
      const text = promptRef.current;
      setIsTruncated(text ? text.scrollWidth > text.clientWidth + 1 : false);
    };
    measure();
    window.addEventListener('resize', measure);
    if (document.fonts && document.fonts.status !== 'loaded') {
      document.fonts.ready.then(measure).catch(() => {});
    }
    return () => window.removeEventListener('resize', measure);
  }, [activeQuestion]);

  /* Reads as a reaction rather than a bare number, souring as the mistakes mount */
  const mistakeLabel = (count: number) => {
    if (count === 0) return 'N/A';
    if (count <= 2) return `${count} \u{1F642}`;
    if (count <= 5) return `${count} \u{1F615}`;
    if (count <= 9) return `${count} \u{1F623}`;
    return `${count} \u{1F525}`;
  };

  useEffect(() => {
    setShuffledAnswers(shuffle(allFlashcards.map(fc => ({ id: fc._id, answer: fc.answer }))));
    setMatchedQuestionIds(new Set());
    setMatchedAnswerIds(new Set());
    setActiveQuestion(null);
    setWrongPairs(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDecks]);

  /* Each column counts its own rows against its own width */
  const questionColRef = useRef<HTMLDivElement>(null);
  const answerColRef = useRef<HTMLDivElement>(null);
  const questionCapacity = useRowCapacity(questionColRef, 132, 12);
  const answerCapacity = useRowCapacity(answerColRef, 132, 12);

  const totalPairs = allFlashcards.length;
  const correctPairs = matchedQuestionIds.size;
  const isComplete = correctPairs === totalPairs && totalPairs > 0;

  /* Picking a question selects it, and picking the same one again clears the selection */
  const handleQuestionClick = (card: { _id: string; answer: string; question: string }) => {
    if (isChecking || matchedQuestionIds.has(card._id)) return;
    setActiveQuestion(prev =>
      prev?.id === card._id ? null : { id: card._id, answer: card.answer, question: card.question }
    );
  };

  /* Right answer is judged on text, but the card that leaves is the one clicked */
  const handleAnswerClick = (entry: AnswerCard) => {
    if (isChecking || !activeQuestion || matchedAnswerIds.has(entry.id)) return;

    if (entry.answer === activeQuestion.answer) {
      setMatchedQuestionIds(prev => new Set([...prev, activeQuestion.id]));
      setMatchedAnswerIds(prev => new Set([...prev, entry.id]));
      setActiveQuestion(null);
    } else {
      /* A wrong pick flashes red and holds the board for a moment before releasing */
      setWrongAnswerId(entry.id);
      setWrongPairs(prev => prev + 1);
      setIsChecking(true);
      flashTimer.current = setTimeout(() => {
        setWrongAnswerId(null);
        setActiveQuestion(null);
        setIsChecking(false);
      }, 700);
    }
  };

  const handleRestart = () => {
    setMatchedQuestionIds(new Set());
    setMatchedAnswerIds(new Set());
    setActiveQuestion(null);
    setWrongAnswerId(null);
    setIsChecking(false);
    setWrongPairs(0);
    setShuffledAnswers(shuffle(allFlashcards.map(fc => ({ id: fc._id, answer: fc.answer }))));
  };

  if (allFlashcards.length === 0) {
    return (
      <div className="flash-match">
        <h2 className="page-heading">FlashMatch</h2>
        <p>No flashcards available. Please select a deck from the home page.</p>
        <Link to="/home" className="back-link">Back to Home</Link>
      </div>
    );
  }

  const remainingQuestions = allFlashcards.filter(fc => !matchedQuestionIds.has(fc._id));
  const remainingAnswers = shuffledAnswers.filter(entry => !matchedAnswerIds.has(entry.id));

  return (
    <div className="flash-match">
      <Link to="/game-menu" className="back-link page-back">Back to Game Menu</Link>
      <h2 className="page-heading">FlashMatch</h2>
      {!isComplete && (
        <div className="game-topline">
          <p className="matchhead">
            {/* Label and value are separate elements, so the two rows line up as a table */}
            <span><i>Matched:</i><b>{correctPairs} / {totalPairs}</b></span>
            <span><i>Mistakes:</i><b>{mistakeLabel(wrongPairs)}</b></span>
          </p>
          {activeQuestion && (
            <div
              className="fm-active"
              style={lineWidth ? ({ '--fm-line': `${lineWidth}px` } as React.CSSProperties) : undefined}
            >
              <button ref={returnRef} type="button" className="back-link fm-return" onClick={() => setActiveQuestion(null)}>
                Unsure? Pick another card
              </button>
              <div className="fm-prompt-row">
                <p className="fm-prompt" ref={promptRef}>Match: <strong>{activeQuestion.question}</strong></p>
                {/* Only offered when the line is actually cut, as there is nothing to open otherwise */}
                {isTruncated && (
                  <button
                    type="button"
                    className="fm-full-btn"
                    aria-label="Show the whole question"
                    onClick={() => setShowFull(true)}
                  >⧉</button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {/* The whole question on a full-size card, for when the prompt could not show it */}
      {showFull && activeQuestion && (
        <div className="fm-overlay" role="dialog" aria-modal="true" onClick={() => setShowFull(false)}>
          <button
            type="button"
            className="back-link fm-overlay-close"
            aria-label="Close"
            onClick={() => setShowFull(false)}
          >×</button>
          <div className="flashcard fm-overlay-card" onClick={event => event.stopPropagation()}>
            <FitText className="card-text" max={30} min={9} centreBox basePad={2}>
              {activeQuestion.question}
            </FitText>
          </div>
        </div>
      )}
      <div className="game-stage">
        <div className="stage-above" />
        {isComplete ? (
          <div className="completion">
            <div className="completion-score">{correctPairs} / {totalPairs}</div>
            <p>All pairs matched{wrongPairs > 0 ? ` — with ${wrongPairs} mistake${wrongPairs !== 1 ? 's' : ''}` : '!'}</p>
            <button onClick={handleRestart} className="button">Play Again</button>
          </div>
        ) : (
          <div className="fm-columns">
            <div className="fm-col">
              <p className="game-subhead">Questions:</p>
              <div className="fm-col-cards" ref={questionColRef}>
                {fillRows(remainingQuestions, questionCapacity).map((row, rowIndex) => (
                  <div className="card-row" key={rowIndex}>
                    {row.map(flashcard => (
                      <div
                        key={flashcard._id}
                        className={activeQuestion?.id === flashcard._id ? 'flashcard selected-q' : 'flashcard'}
                        onClick={() => handleQuestionClick(flashcard)}
                      >
                        <FitText className="question card-text" max={20} min={6} centreBox basePad={3} clampToBox>{flashcard.question}</FitText>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="fm-col">
              <p className="game-subhead">Answers:</p>
              {/* Only revealed once a question is picked, which is what fm-awaiting dims */}
              <div className={activeQuestion ? 'fm-col-cards' : 'fm-col-cards fm-awaiting'} ref={answerColRef}>
                {fillRows(remainingAnswers, answerCapacity).map((row, rowIndex) => (
                  <div className="card-row" key={rowIndex}>
                    {row.map(entry => (
                      <div
                        key={entry.id}
                        className={wrongAnswerId === entry.id ? 'flashcard wrong-flash' : 'flashcard'}
                        onClick={() => handleAnswerClick(entry)}
                      >
                        <FitText className="answer card-text" max={20} min={6} centreBox basePad={3} clampToBox>{entry.answer}</FitText>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="stage-below" />
      </div>
    </div>
  );
};

export default FlashMatch;
