const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const routes = require('./routes');

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Routes API
app.use('/api', routes);

// Servir les fichiers statiques du frontend compilé
app.use(express.static(path.join(__dirname, 'public')));

// Fallback SPA : toutes les routes non-API renvoient vers index.html
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;
