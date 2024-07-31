const express = require('express');
const decksRouter = express.Router();
const decksCo = require('../controllers/decksCo');

decksRouter.post('/', decksCo.createDeck);
decksRouter.get('/', decksCo.getAllDecks);
decksRouter.get('/:id', decksCo.getDeckById);
decksRouter.put('/:id', decksCo.updateDeck);
decksRouter.delete('/:id', decksCo.deleteDeck);

module.exports = decksRouter;
