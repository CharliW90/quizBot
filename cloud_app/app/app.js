const express = require('express');
const portal = require('./adminPortal.js');
const { fetchResponse, fetchAllResponses, listResponses } = require('./mvc/controllers/formResponses.controller.js');
const { checker } = require('./mvc/controllers/health.controller.js');
const { passcheck } = require('./mvc/controllers/passcheck.controller.js');
const { checkPermission } = require('./mvc/controllers/permissions.controller.js');

const app = express();

app.use(express.json());

app.get('/health',  (req, res) => {
  res.status(200).send('pong');
})

app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log("Request Refused: Auth Header Missing")
    return res.status(401).send('Unauthorized');
  }

  const apiKey = authHeader.split(' ')[1];
  if (apiKey !== process.env.apiPasskey) {
    console.log("Request Refused: Incorrect API Passkey")
    return res.status(401).send('Unauthorized');
  }

  next();
});

app.use('/adminPortal', portal)

app.get('/api/health', checker);

app.get('/api/permissions', checkPermission)

app.get('/api/responses/all', fetchAllResponses);

app.get('/api/responses/:roundNumber', fetchResponse);

app.get('/api/responses/', listResponses);

app.get('/api/passcheck', passcheck);

app.get('/test/statusCodes/:code', (req, res) => {
  const {code} = req.params;
  res.status(code).send('Test Response')
})

app.all('/api/*', (req, res) => {
  res.status(404).send('Endpoint not found')
});

app.use((err, req, res, next) => {
  if(err.status && err.msg){
    console.log(`Error ${err.status}:\n`, err.msg)
    res.send(err.msg);
  } else {
    next(err);
  }
});

module.exports = app;