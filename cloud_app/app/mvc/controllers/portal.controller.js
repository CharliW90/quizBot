const { ping } = require("../models/health.model.js");

exports.home = (req, res, next) => {
  res.status(501).send("This endpoint is under development.")
};