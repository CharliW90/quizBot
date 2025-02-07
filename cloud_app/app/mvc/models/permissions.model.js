const instance = require("../../utility/connection.js")

exports.checkPermissions = (parsedURL) => {
  return instance.get(parsedURL)
  .then(response => {
    return response.data;
  })
}