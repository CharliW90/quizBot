const express = require('express');
const portal = require('./adminPortal.js');
const { fetchResponse } = require('./mvc/controllers/formResponses.controller.js');
const { checker } = require('./mvc/controllers/health.controller.js');
const { passcheck } = require('./mvc/controllers/passcheck.controller.js');

const app = express();

app.use(express.json());

app.get('/health', checker)

app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send('Unauthorized');
  }

  const apiKey = authHeader.split(' ')[1];
  if (apiKey !== process.env.apiPasskey) {
    return res.status(403).send('Forbidden');
  }

  next();
});

app.use('/api/adminPortal', portal)

app.get('/api/health', (req, res) => {
  res.status(200).send('pong');
});

app.get('/api/responses/:roundNumber', fetchResponse);

app.get('/api/passcheck', passcheck);

app.all('/api/*', (req, res) => {
  res.send(404).send('Endpoint not found')
});

app.use((err, req, res, next) => {
  if(err.status && err.msg){
    res.status(err.status).send(err.msg);
  } else {
    next(err);
  }
});

module.exports = app;