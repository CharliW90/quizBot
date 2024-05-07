const app = require('./app.js')

const PORT = process.env.PORT || 8080;

function listen() {
  return app.listen(PORT, (err) => {
    if (err) {
      console.error(err)
    } else {
      console.log(`Server running on ${process.release.name} ${process.version}...`)
      console.log(`Server listening on port ${PORT}...`)
    }
  })
}

module.exports = listen