const { newPassword } = require("../../utility/hotPass.js");
const { fetchFormResponses } = require("../models/formResponses.model.js");

exports.fetchResponse = (req, res, next) => {
  const {roundNumber} = req.params;
  const password = newPassword();
  const scriptUrl = `https://script.google.com/macros/s/${process.env.scriptId}/exec`;

  fetchFormResponses(scriptUrl, roundNumber, password)
  .then((data) => {
    console.log(data)
    res.status(200).send(data)
  })
  .catch((err) => {
    if(err.code === '23502'){
      next({status: 400, msg: "Bad request"})  //needs amending once common error codes known
    } else {
      next(err)
    }
  })
};