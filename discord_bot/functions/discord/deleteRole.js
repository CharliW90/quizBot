const findRole = require("./findRole")

module.exports = async (interaction, role, reason) => {
  const {error, response} = findRole(interaction, role.name);
  if(response){
    const deletedRole = await response.delete(reason);
    return {error: null, response: deletedRole};
  } else {
    return {error, response: null};
  }
  
}

// checks if the requested role name already exists, and deletes it if it does
// returns either the deleted roleObject, or the error message