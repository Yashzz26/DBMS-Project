require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const { connectToDatabase } = require('./db');
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'development-only-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' }
}));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);

async function startServer() {
  try {
    await connectToDatabase();
    app.listen(port, () => {
      console.log(`Repair shop server listening on port ${port}`);
    });
  } catch (error) {
    console.error('Unable to connect to MongoDB:', error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
