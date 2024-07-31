export interface Deck {
    _id: string;
    name: string;
    description: string;
    flashcards: {
      _id: string;  
      question: string;
      answer: string;
    }[];
}
  
export interface Flashcard {
    _id: string;
    question: string;
    answer: string; 
}
  