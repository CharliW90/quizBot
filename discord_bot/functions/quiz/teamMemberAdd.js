const { roleAssign } = require("../discord");

module.exports = (role, members) => {
  if(!role || !members || members.length < 1){
    const error = {code: 400, message: `Role was ${role}, Members were ${members}`};
    console.error(error);
    return {error, response: null};
  }

  const {error, response} = roleAssign(role, members);

  if(error){
    return {error: {code: 500, message: `roleAssign failed with Error: ${error}`}, response: null}
  }

  return {error: null, response: `${role.name} assigned to ${members.join(', ')}`};
}