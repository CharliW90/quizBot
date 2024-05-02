const { ping } = require("../models/health.model.js");

exports.checker = (req, res, next) => {
  ping("http://worldtimeapi.org/api/timezone/Europe/London")
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