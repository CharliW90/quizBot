const { newPassword } = require("../../utility/hotPass.js");
const { checkPermissions } = require("../models/permissions.model.js");

const scriptUrl = `https://script.google.com/macros/s/${process.env.webAppUrl}/exec`
const reAuth = `https://script.google.com/u/1/home/projects/${process.env.scriptId}/edit`

exports.checkPermission = (req, res, next) => {
  // Create a new temporary password so that the apps script can check that the response came from this app
  const password = newPassword();

  checkPermissions(`${scriptUrl}?endpoint=permissionsCheck&passkey=${password}`)
  .then((data) => {
    // no need to JSON.parse the data thanks to app.use(express.json()) in our app.js file
    if(data.response){
      res.status(200).send(data.response);
    } else {
      res.status(206).send(data);
    }
  })
  .catch((err) => {
    if(err.response.status === 403 && String(err.response.data).startsWith("<!DOCTYPE html>")){
      res.status(403).send({appsScript: true, reAuth});
    } else {
      next(err);
    }
  })
};