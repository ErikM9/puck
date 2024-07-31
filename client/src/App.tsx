import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './Components/Auth/AuthPage';
import HomePage from './Components/Home/HomePage';
import CreateDecksPage from './Components/CreateDecks/CreateDecksPage';
import FlashFlip from './Components/Games/FlashFlip';
import GameMenu from './Components/Games/GameMenu';
import FlashChoice from './Components/Games/FlashChoice';
import FlashMatch from './Components/Games/FlashMatch';
import Navbar from './Components/Navbar/Navbar';
import EditDeckPage from './Components/Home/EditDeckPage'; // Import the new EditDeckPage
import './App.css';
import axios from 'axios';
import { Deck } from './Components/CreateDecks/types';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDecks, setSelectedDecks] = useState<string[]>([]);

  useEffect(() => {
    if (isLoggedIn) {
      const fetchDecks = async () => {
        try {
          const response = await axios.get(`${import.meta.env.VITE_API_KEY}/decks`);
          setDecks(response.data);
        } catch (error) {
          console.error('Error fetching decks:', error);
        }
      };

      fetchDecks();
    }
  }, [isLoggedIn]);

  const handleLogin = (token: string) => {
    localStorage.setItem('token', token);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
  };

  const addNewDeck = (newDeck: Deck) => {
    setDecks(prevDecks => [...prevDecks, newDeck]);
  };

  const handleSelectDeck = (deckName: string) => {
    const isDeckSelected = selectedDecks.includes(deckName);
    const updatedSelectedDecks = isDeckSelected
      ? selectedDecks.filter(selectedDeck => selectedDeck !== deckName)
      : [...selectedDecks, deckName];
    setSelectedDecks(updatedSelectedDecks);
  };

  return (
    <Router>
      <div className="app">
        <div className="background">
          <div className="text text-before"></div>
          <div className="text text-after"></div>
        </div>
        <Navbar isLoggedIn={isLoggedIn} onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={isLoggedIn ? <Navigate to="/home" /> : <AuthPage onLogin={handleLogin} />} />
          <Route path="/home" element={isLoggedIn ? <HomePage decks={decks} onSelectDeck={handleSelectDeck} selectedDecks={selectedDecks} setDecks={setDecks} setSelectedDecks={setSelectedDecks} /> : <Navigate to="/" />} />
          <Route path="/create-decks" element={isLoggedIn ? <CreateDecksPage onDeckCreated={addNewDeck} /> : <Navigate to="/" />} />
          <Route path="/game-menu" element={isLoggedIn ? <GameMenu /> : <Navigate to="/" />} />
          <Route path="/flash-flip" element={isLoggedIn ? <FlashFlip selectedDecks={decks.filter(deck => selectedDecks.includes(deck.name))} /> : <Navigate to="/" />} />
          <Route path="/flash-choice" element={isLoggedIn ? <FlashChoice selectedDecks={decks.filter(deck => selectedDecks.includes(deck.name))} /> : <Navigate to="/" />} />
          <Route path="/flash-match" element={isLoggedIn ? <FlashMatch selectedDecks={decks.filter(deck => selectedDecks.includes(deck.name))} /> : <Navigate to="/" />} />
          <Route path="/edit-deck/:id" element={isLoggedIn ? <EditDeckPage /> : <Navigate to="/" />} /> {/* New route for editing decks */}
        </Routes>
      </div>
    </Router>
  );
};

export default App;
