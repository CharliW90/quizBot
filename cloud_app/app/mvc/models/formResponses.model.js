const instance = require("../../utility/connection.js")

exports.fetchFormResponses = (scriptUrl, round_number, password) => {
  return instance.get(scriptUrl + `?formId=${round_number}&passKey=${password}`)
  .then(response => {
    return response.data;
  })
}