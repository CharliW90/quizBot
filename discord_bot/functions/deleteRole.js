const findRole = require("./findRole")

module.exports = async (interaction, role, reason) => {
  const roleExists = findRole(interaction, role.name);
  if(roleExists){
    const deletedRole = await roleExists.delete(reason)
    return {error: null, role: deletedRole}
  } else {
    return {error: `Cannot find a role with the name ${role.name}`};
  }
  
}

// checks if the requested role name already exists, and deletes it if it does
// returns either the deleted roleObject, or the error message