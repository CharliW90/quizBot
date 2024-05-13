const { checkPassword } = require("../models/passcheck.model");

exports.passcheck = (req, res, next) => {
  const {password} = req.headers;

  checkPassword(password)
  .then((bool) => {
    if(bool){
      res.status(200).send(password);
    } else {
      res.status(500).send("Unknown error when checking passkey token");
    }
  })
  .catch((err) => {
    next(err);
  })
}