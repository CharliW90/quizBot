const { newPassword } = require("../../utility/hotPass.js");
const { fetchFormResponses } = require("../models/formResponses.model.js");

const scriptUrl = `https://script.google.com/macros/s/${process.env.webAppUrl}/exec`
const reAuth = `https://script.google.com/u/1/home/projects/${process.env.scriptId}/edit`

exports.fetchResponse = (req, res, next) => {
  const {roundNumber} = req.params;
  if(isNaN(roundNumber)){
    next({status: 404, msg: "Invalid roundnumber parameter"})
  } else {
    // Create a new temporary password so that the apps script can check that the response came from this app
    const password = newPassword();

    fetchFormResponses(`${scriptUrl}?formId=${roundNumber}&passkey=${password}`)
    .then((data) => {
      // no need to JSON.parse the data thanks to app.use(express.json()) in our app.js file
      // responses endpoint should always return response as an array
      res.status(200).send([data]);
    })
    .catch((err) => {
      if(err.response.status === 403 && String(err.response.data).startsWith("<!DOCTYPE html>")){
        res.status(403).send({appsScript: true, reAuth});
      } else {
        next(err);
      }
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
    // no need to JSON.parse the data thanks to app.use(express.json()) in our app.js file
    // responses endpoint should always return response as an array (responses is already an array)
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
  res.status(501).send("This endpoint is under development.")
}