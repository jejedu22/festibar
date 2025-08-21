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

// Servir le frontend compilé
app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;
