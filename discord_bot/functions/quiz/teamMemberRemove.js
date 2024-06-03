const { roleRemove } = require("../discord");

module.exports = (role, members) => {
  if(!role || !members || members.length < 1){
    const error = {"code": 400, "message": `Role was ${role}, Members were ${members}`};
    console.error(error);
    return {error, response: null};
  }

  const {error, response} = roleRemove(role, members);

  if(error){
    return {error: {code: 500, message: `roleRemove failed with Error: ${error}`}, response: null}
  }

  return {error: null, response: `${response.name} assigned to ${members.join(', ')}`};
}