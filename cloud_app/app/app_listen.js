const app = require('./app.js')

const PORT = process.env.PORT || 3000;

function listen() {
  return app.listen(PORT, (err) => {
    if (err) {
      console.error(err)
    } else {
      console.log(`Server listening on port ${PORT}...`)
    }
  })
}

module.exports = listen