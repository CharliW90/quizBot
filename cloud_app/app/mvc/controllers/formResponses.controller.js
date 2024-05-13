const { newPassword } = require("../../utility/hotPass.js");
const { fetchFormResponses } = require("../models/formResponses.model.js");

exports.fetchResponse = (req, res, next) => {
  const {roundNumber} = req.params;
  if(roundNumber !== "all" && Number(roundNumber) === NaN){
    next({status: 404, msg: "Invalid roundnumber parameter"})
  } else {
    // Create a new temporary password so that the apps script can check that the response came from this app
    const password = newPassword();

    fetchFormResponses(`https://script.google.com/macros/s/${process.env.scriptId}/exec?formId=${roundNumber}&passkey=${password}`)
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