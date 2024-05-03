const { ping } = require("../models/health.model.js");

exports.checker = (req, res, next) => {
  ping("http://worldtimeapi.org/api/ip")
  .then((pingResponse) => {
    const healthResponse = {
      "bot":{
        "health": `${pingResponse.status}:${pingResponse.statusText}`,
        "agent": pingResponse.config.headers['User-Agent'],
        "auth": {},
        "containerPort": process.env.PORT
      },
      "internet": pingResponse.data
    }
    res.status(200).send(healthResponse)
  })
  .catch((err) => {
    if(err.code === '23502'){
      next({status: 400, msg: "Bad request"})  //needs amending once common error codes known
    } else {
      next(err)
    }
  })
};