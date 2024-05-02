const instance = require("../../utility/connection.js")

exports.fetchFormResponses = (scriptUrl, round_number) => {
  return instance.get(scriptUrl + `?formId=${round_number}`)
  .then(response => {
    return response.data;
  })
}