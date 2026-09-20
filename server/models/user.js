const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    /* Lowercased and trimmed on the way in, so the unique index actually catches duplicates */
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },

    /* Password recovery lives on the user, and Mongoose drops anything the schema omits */
    resetCodeHash: { type: String, default: null },
    resetCodeExpiry: { type: Date, default: null },
    resetCodeAttempts: { type: Number, default: 0 },
    resetCodeLastSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);
module.exports = User;
