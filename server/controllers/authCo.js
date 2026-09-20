const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const {
  validateEmail,
  validatePasswordLength,
  normaliseEmail,
  hashPassword,
  minPasswordLength,
} = require('../utils/utils');
const { sendRegistrationEmail, sendPasswordResetEmail } = require('../utils/emailService');

const RESET_CODE_TTL_MS = 15 * 60 * 1000;
const RESET_RESEND_COOLDOWN_MS = 60 * 1000;
const RESET_MAX_ATTEMPTS = 5;

/* Six digits is easy to guess at volume, so the code is stored hashed and the tries are counted */
const hashResetCode = (code) =>
  crypto.createHash('sha256').update(String(code)).digest('hex');

/* Stands in for a real hash when no account matched, so a wrong email costs the same time */
const DUMMY_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8.EKuBs1sTGkFTzHrJfMQmTOgAt4Iu';

/* Shared by verify and reset, returning either the user or the error, and spending a wrong try */
const checkResetCode = async (email, code) => {
  const invalid = { status: 400, body: { message: 'Invalid or expired code.' } };

  const user = await User.findOne({ email: normaliseEmail(email) });
  if (!user || !user.resetCodeHash || !user.resetCodeExpiry) return { error: invalid };
  if (user.resetCodeExpiry.getTime() < Date.now()) return { error: invalid };
  if (user.resetCodeAttempts >= RESET_MAX_ATTEMPTS) {
    return { error: { status: 429, body: { message: 'Too many attempts. Please request a new code.' } } };
  }

  if (hashResetCode(code) !== user.resetCodeHash) {
    user.resetCodeAttempts += 1;
    await user.save();
    return { error: invalid };
  }

  return { user };
};

exports.register = async (req, res) => {
  try {
    const email = normaliseEmail(req.body.email);
    const { password } = req.body;

    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    if (!validatePasswordLength(password)) {
      return res.status(400).json({ message: `Password must be at least ${minPasswordLength} characters long` });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'This email is already in use' });
    }

    const hashedPassword = await hashPassword(password);
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();

    /* Left unawaited, because a slow mail server should not keep the person waiting to log in */
    sendRegistrationEmail(email).catch(err =>
      console.error('Registration email failed to send:', err.message)
    );

    res.status(201).json({ message: 'Registration successful! Please log in.' });
  } catch (error) {
    /* Two people can register at once, and the unique index is what actually settles it */
    if (error.code === 11000 && error.keyPattern?.email) {
      return res.status(400).json({ message: 'This email is already in use' });
    }
    console.error('Error registering:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const email = normaliseEmail(req.body.email);
    const { password } = req.body;

    const user = await User.findOne({ email });
    const isPasswordValid = await bcrypt.compare(password ?? '', user ? user.password : DUMMY_HASH);

    /* One answer for a wrong email and a wrong password, so neither confirms the other */
    if (!user || !isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/* There is no server-side session to end, so this only confirms that the client dropped its token */
exports.logout = async (req, res) => {
  res.status(200).json({ message: 'Logout successful' });
};

/* Replies the same whether or not the address is registered, so it cannot be used to find accounts */
exports.forgotPassword = async (req, res) => {
  try {
    const email = normaliseEmail(req.body.email);
    const generic = { message: 'If that email is registered, a recovery code has been sent.' };

    if (!validateEmail(email)) return res.status(200).json(generic);

    const user = await User.findOne({ email });
    if (!user) return res.status(200).json(generic);

    /* Repeat requests inside the cooldown get the same reply and send nothing, so no inbox floods */
    if (user.resetCodeLastSentAt && Date.now() - user.resetCodeLastSentAt.getTime() < RESET_RESEND_COOLDOWN_MS) {
      return res.status(200).json(generic);
    }

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    user.resetCodeHash = hashResetCode(code);
    user.resetCodeExpiry = new Date(Date.now() + RESET_CODE_TTL_MS);
    user.resetCodeAttempts = 0;
    user.resetCodeLastSentAt = new Date();
    await user.save();

    /* Also unawaited, as a slower reply for real accounts would give away which ones exist */
    sendPasswordResetEmail(email, code).catch(err =>
      console.error('Password reset email failed to send:', err.message)
    );

    res.status(200).json(generic);
  } catch (error) {
    console.error('Error in forgotPassword:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/* Tests a code without consuming it, which is what lets the client open the new-password step */
exports.verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    const result = await checkResetCode(email, code);
    if (result.error) return res.status(result.error.status).json(result.error.body);

    res.status(200).json({ message: 'Code verified.' });
  } catch (error) {
    console.error('Error in verifyResetCode:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/* Checks the code again and clears it in the same save, so one code can only be spent once */
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!validatePasswordLength(newPassword)) {
      return res.status(400).json({ message: `Password must be at least ${minPasswordLength} characters long` });
    }

    const result = await checkResetCode(email, code);
    if (result.error) return res.status(result.error.status).json(result.error.body);

    const user = result.user;
    user.password = await hashPassword(newPassword);
    user.resetCodeHash = null;
    user.resetCodeExpiry = null;
    user.resetCodeAttempts = 0;
    await user.save();

    res.status(200).json({ message: 'Password reset successful! Please log in.' });
  } catch (error) {
    console.error('Error in resetPassword:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
