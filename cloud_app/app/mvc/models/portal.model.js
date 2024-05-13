const instance = require("../../utility/connection.js")

exports.landingPage = () => {
  return instance.get(parsedURL)
  .then(response => {
    return response.data;
  })
}