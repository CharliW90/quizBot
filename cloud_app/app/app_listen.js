const app = require('./app.js')

function listen() {
  return app.listen(9090, (err) => {
    if (err) {
      console.error(err)
    } else {
      console.log("Server listening on port 9090...")
    }
  })
}

module.exports = listen