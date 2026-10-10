const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/authRouter');
const mainRouter = require('./routes/mainRouter');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api', mainRouter);
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

module.exports = app;