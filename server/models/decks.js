const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const flashcardSchema = new Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true }
});

const deckSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  flashcards: [flashcardSchema]
});

const Deck = mongoose.model('Deck', deckSchema);
module.exports = Deck;

