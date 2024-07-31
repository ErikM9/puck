const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { validateEmail, validatePasswordLength, hashPassword, minPasswordLength } = require('../utils/utils');
const randomSecret = () => {
  return require('crypto').randomBytes(64).toString('hex');
};
const SECRET = randomSecret()

exports.register = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!validateEmail(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }
        if (!validatePasswordLength(password)) {
            return res.status(400).json({ message: `Password must be at least ${minPasswordLength} characters long` });
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res.status(400).json({ message: 'This email is already in use, choose a different one' });
        }
        const hashedPassword = await hashPassword(password);
        const newUser = new User({
          email,
          password: hashedPassword
        });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      if (error.code === 11000 && error.keyPattern.email) {
        return res.status(400).json({ message: 'This email is already in use, choose a different one' });
    } else {
        console.error('Error registering:', error);
        res.status(500).json({ message: 'Error' });
    }
}
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
          return res.status(401).json({ message: 'Invalid credentials' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign({ userId: user._id }, SECRET, { expiresIn: '1h' });
        res.status(200).json({ token });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ message: 'Error' });
    }
};

exports.logout = async (req, res) => {
  try {

      res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
      console.error('Error logging out:', error);
      res.status(500).json({ message: 'Error' });
  }
};
