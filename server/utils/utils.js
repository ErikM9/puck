const bcrypt = require('bcrypt');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const minPasswordLength = 6;

const validateEmail = (email) => {
  return emailRegex.test(email);
};

const validatePasswordLength = (password) => {
  return password.length >= minPasswordLength;
};

const hashPassword = async (password) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    return hashedPassword;
};

module.exports = { validateEmail, validatePasswordLength, hashPassword, minPasswordLength };