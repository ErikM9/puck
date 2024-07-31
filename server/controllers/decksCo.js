const Deck = require('../models/decks');
// const Flashcard = require('../models/flashcard');

// Create a new deck with flashcards
exports.createDeck = async (req, res) => {
    try {
        const { name, description, flashcards } = req.body;

        // Log the received data
        console.log('Received flashcards:', flashcards);

        const newDeck = new Deck({
            name,
            description,
            flashcards: flashcards.map(fc => ({
                question: fc.question,
                answer: fc.answer
            }))
        });

        // Log the new deck data before saving
        console.log('Saving new deck:', newDeck);

        await newDeck.save();
        res.status(201).json(newDeck);
    } catch (error) {
        console.error('Error creating deck:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get all decks with flashcards populated
exports.getAllDecks = async (req, res) => {
    try {
        const decks = await Deck.find();
        res.status(200).json(decks);
    } catch (error) {
        console.error('Error fetching decks:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

//Get deck by ID
exports.getDeckById = async (req, res) => {
    try {
      const { id } = req.params;
      const deck = await Deck.findById(id);
      if (!deck) {
        return res.status(404).json({ message: 'Deck not found' });
      }
      res.status(200).json(deck);
    } catch (error) {
      console.error('Error fetching deck:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
};

// Update a deck
exports.updateDeck = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, flashcards } = req.body;

        // Update deck including flashcards if provided
        const updatedDeck = await Deck.findByIdAndUpdate(id, { name, description, flashcards }, { new: true });

        // Log the updated deck data
        console.log('Updated deck:', updatedDeck);

        res.status(200).json(updatedDeck);
    } catch (error) {
        console.error('Error updating deck:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Delete a deck
exports.deleteDeck = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedDeck = await Deck.findByIdAndDelete(id);
        if (!deletedDeck) {
            return res.status(404).json({ message: 'Deck not found' });
        }
        res.status(200).json({ message: 'Deck deleted successfully' });
    } catch (error) {
        console.error('Error deleting deck:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
