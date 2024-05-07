const express = require('express');
const { fetchResponse } = require('./mvc/controllers/formResponses.controller.js');
const { checker } = require('./mvc/controllers/health.controller.js');
const { passcheck } = require('./mvc/controllers/passcheck.controller.js');

const app = express();
app.use(express.json());

app.get('/health', checker)

app.get('/api/health', (req, res) => {
  res.status(200).send('pong');
})

app.get('/api/responses/:roundNumber', fetchResponse)

app.get('/api/passcheck', passcheck)

app.use((err, req, res, next) => {
  if(err.status && err.msg){
    res.status(err.status).send(err.msg);
  } else {
    next(err);
  }
})

module.exports = app;