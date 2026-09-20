const express = require('express');
const authRouter = express.Router();
const authCo = require('../controllers/authCo');

authRouter.post('/register', authCo.register);
authRouter.post('/login', authCo.login);
authRouter.post('/logout', authCo.logout);

/* Recovery is three calls: ask for a code, check it, then spend it on a new password */
authRouter.post('/forgot-password', authCo.forgotPassword);
authRouter.post('/verify-reset-code', authCo.verifyResetCode);
authRouter.post('/reset-password', authCo.resetPassword);

module.exports = authRouter;
