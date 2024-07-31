import React from 'react';
import { Link } from 'react-router-dom';

const GameMenu: React.FC = () => {
  return (
    <div className="game-menu">
      <h2 className="fhead">Game Menu</h2>
      <div className="game-item">
        <h3>FlashFlip</h3>
        <Link to="/flash-flip" className="play-button">Play</Link>
      </div>
      <div className="game-item">
        <h3>FlashChoice</h3>
        <Link to="/flash-choice" className="play-button">Play</Link>
      </div>
      <div className="game-item">
        <h3>FlashMatch</h3>
        <Link to="/flash-match" className="play-button">Play</Link>
      </div>
      <Link to="/home" className="back-to-home-link button">Back to Home</Link>
    </div>
  );
};

export default GameMenu;
