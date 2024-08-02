const { roleRemove } = require("../discord");

module.exports = (teamRole, members) => {
  if(!teamRole || !members || members.length < 1){
    const error = {code: 400, message: `Role was ${teamRole}, Members were ${members}`};
    console.error(error);
    return {error, response: null};
  }

  const teamRoleRemove = roleRemove(teamRole, members);

  if(teamRoleRemove.error){
    return {error: {code: 500, message: `roleRemove failed with Error: ${teamRoleRemove.error}`}, response: null}
  }
  
  const genericTeamsRole = guild.roles.cache.map(role => role).filter(role => role.name === "Teams");
  const genericRoleRemove = roleRemove(genericTeamsRole, members)

  if(genericRoleRemove.error){
    return {error: {code: 500, message: `roleRemove failed with Error: ${genericRoleRemove.error}`}, response: null}
  }

  return {error: null, response: `${teamRoleRemove.response.role} removed from ${members.join(', ')}`};
}