const { newPassword } = require("../../utility/hotPass.js");
const { fetchFormResponses } = require("../models/formResponses.model.js");

exports.fetchResponse = (req, res, next) => {
  if(req.query.passkey !== process.env.apiPasskey){
    next({status: 401, msg: "You have not provided valid access rights to this endpoint."})
  } else {
    const {roundNumber} = req.params;
    if(roundNumber !== "all" && Number(roundNumber) === NaN){
      next({status: 404, msg: "Invalid roundnumber parameter"})
    } else {
      const password = newPassword();
  
      fetchFormResponses(`https://script.google.com/macros/s/${process.env.scriptId}/exec?formId=${roundNumber}&passkey=${password}`)
      .then((data) => {
        // no need to JSON.parse the data thanks to app.use(express.json()) in our app.js file
        res.status(200).send(data);
      })
      .catch((err) => {
        next(err);
      })
    };
  };
};