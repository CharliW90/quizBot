const express = require('express')
const portal = express.Router()

// middleware that is specific to this router
const timeLog = (req, res, next) => {
  console.log('Portal Activated - Time: ', Date.now())
  next()
}
portal.use(timeLog)

// define the home page route
portal.get('/', (req, res) => {
  res.status(200).send('Portal home page')
})

portal.get('/*', (req, res) => {
  res.status(501).send("This endpoint is under development.")
})

module.exports = portal