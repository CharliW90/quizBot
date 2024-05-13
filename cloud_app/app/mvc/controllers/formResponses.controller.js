const { newPassword } = require("../../utility/hotPass.js");
const { fetchFormResponses } = require("../models/formResponses.model.js");

const scriptUrl = `https://script.google.com/macros/s/${process.env.scriptId}/exec`

exports.fetchResponse = (req, res, next) => {
  const {roundNumber} = req.params;
  if(Number(roundNumber) === NaN){
    next({status: 404, msg: "Invalid roundnumber parameter"})
  } else {
    // Create a new temporary password so that the apps script can check that the response came from this app
    const password = newPassword();

    fetchFormResponses(`${scriptUrl}?formId=${roundNumber}&passkey=${password}`)
    .then((data) => {
      // no need to JSON.parse the data thanks to app.use(express.json()) in our app.js file
      res.status(200).send(data);
    })
    .catch((err) => {
      if(err.status === 403){
        res.status(500).send("This error likely originated from the google Apps Script requiring permissions to be re-applied - contact Arcadius to fix this.")
      }
      next(err);
    })
  };
};

exports.fetchAllResponses = (req, res, next) => {
  const allResponses = [];
  const promises = [];

  for(let i = 6; i > 0; i--){
    const password = newPassword();
    promises.push(fetchFormResponses(`${scriptUrl}?formId=${i}&passkey=${password}`))
  }
  return Promise.all(promises)
  .then((data) => {
    data.forEach((response) => {
      allResponses.push(response);
    })
    return allResponses
  })
  .then((responses) => {
    res.status(200).send(responses);
  })
  .catch((err) => {
    if(err.status === 403){
      res.status(500).send("This error likely originated from the google Apps Script requiring permissions to be re-applied - contact Arcadius to fix this.")
    }
    next(err);
  })
}

exports.listResponses = (req, res, next) => {

}