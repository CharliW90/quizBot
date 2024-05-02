const instance = require("../../utility/connection.js")

exports.fetchFormResponses = (url) => {
  instance.get(url)
  .then(response => {
    console.log(response)
    console.log("RESPONSE!!")
    console.log(response.data);
    return response.data;
  })
}