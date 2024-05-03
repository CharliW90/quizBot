const instance = require("../../utility/connection.js")

exports.ping = (url) => {
  return instance.get(url)
  .then(response => {
    return response;
  })
}