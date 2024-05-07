const { checkForPassword } = require("../../utility/hotPass")

exports.checkPassword = (password) => {
  return new Promise((resolve, reject) => {
    const result = checkForPassword(password);
    
    if (result) {
      resolve(true);
    } else {
      reject({status: 403, msg: "incorrect passkey token"});
    }
  });
}