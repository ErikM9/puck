const express = require('express');
const authRouter = express.Router();
const authCo = require('../controllers/authCo');

authRouter.post('/register', authCo.register);
authRouter.post('/login', authCo.login);
authRouter.post('/logout', authCo.logout);

module.exports = authRouter;