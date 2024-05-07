const { checkForPassword } = require("../../utility/hotPass")

exports.checkPassword = (password) => {
  return new Promise((resolve, reject) => {
    const result = checkForPassword(password);
    console.log(`result received is ${result}`)
    if (result) {
      resolve(true);
    } else {
      reject({status: 403, msg: "incorrect passkey token"});
    }
  });
}