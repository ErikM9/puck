import React from 'react';
import { Link } from 'react-router-dom';

/* Choice of the three games, reached once at least one deck has been selected */
const GameMenu: React.FC = () => {
  return (
    <div className="game-menu">
      <Link to="/home" className="back-link page-back">Back to Home</Link>
      <h2 className="page-heading">Game Menu</h2>
      <div className="game-list">
        <div className="game-item">
          <div className="game-item-info">
            <h3>FlashFlip</h3>
            <p>Flip through each card at your own pace and reveal the answer that waits quietly hidden behind it whenever you feel ready.</p>
          </div>
          <Link to="/flash-flip" className="game-play">Play</Link>
        </div>
        <div className="game-item">
          <div className="game-item-info">
            <h3>FlashChoice</h3>
            <p>Pick the correct answer from three options on every card and score each one as you work steadily through the whole deck.</p>
          </div>
          <Link to="/flash-choice" className="game-play">Play</Link>
        </div>
        <div className="game-item">
          <div className="game-item-info">
            <h3>FlashMatch</h3>
            <p>Pair each question with its matching answer across two shuffled columns of cards until absolutely none of them remain unpaired.</p>
          </div>
          <Link to="/flash-match" className="game-play">Play</Link>
        </div>
      </div>
    </div>
  );
};

export default GameMenu;
