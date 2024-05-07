const { newPassword } = require("../../utility/hotPass.js");
const { fetchFormResponses } = require("../models/formResponses.model.js");

exports.fetchResponse = (req, res, next) => {
  if(req.query.passkey === process.env.apiPasskey){
    const {roundNumber} = req.params;
    console.log(typeof(roundNumber));
    if(typeof(roundNumber) === 'number'){
      console.log("roundnumber is number")
    } else {
      if(roundNumber === "all"){
        console.log("all rounds wanted")
      }
    }

    const password = newPassword();

    fetchFormResponses(`https://script.google.com/macros/s/${process.env.scriptId}/exec?formId=${roundNumber}&passkey=${password}`)
    .then((data) => {
      // no need to JSON.parse the data thanks to app.use(express.json()) in our app.js file
      res.status(200).send(data);
    })
    .catch((err) => {
        next(err);
    })
  } else {
    next({status: 401, msg: "You have not provided valid access rights to this endpoint."})
  }
};