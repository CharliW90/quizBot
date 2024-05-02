const express = require('express');
const { fetchResponse } = require('./mvc/controllers/formResponses.controller.js');
const { checker } = require('./mvc/controllers/health.controller.js');

const app = express();
app.use(express.json());

app.get('/health', checker)

app.get('/api/check', (req, res) => {
  console.log('Received ping request on /api/check');
  res.send('pong');
})

app.get('/api/responses/:roundNumber', fetchResponse)

app.use((err, req, res, next) => {
  if(err.status && err.msg){
    res.status(err.status).send(err);
  } else {
    next(err);
  }
})

module.exports = app;