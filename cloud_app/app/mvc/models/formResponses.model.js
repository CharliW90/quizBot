const instance = require("../../utility/connection.js")

exports.fetchFormResponses = (parsedURL) => {
  return instance.get(parsedURL)
  .then(response => {
    return response.data;
  })
}