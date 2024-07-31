const express = require('express');
const mongoose = require('mongoose');
const db = mongoose.connection;
const authRoutes = require('./routes/auth');
const decksRoutes = require('./routes/decks')
const cors = require('cors');
const connectDB = require('./config/database');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

connectDB();

// db.on('error', console.error.bind(console, 'MongoDB connection error:'));
// db.once('open', () => {
//   console.log('Connected to MongoDB database');
// });

app.use('/auth', authRoutes);
app.use('/decks', decksRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`);
});
