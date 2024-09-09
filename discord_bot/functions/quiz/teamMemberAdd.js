const { roleAssign } = require("../discord");

module.exports = (guild, teamRole, members) => {
  if(!teamRole || !members || members.length < 1){
    const error = {code: 400, message: `Role was ${teamRole}, Members were ${members}`};
    console.error(error);
    return {error, response: null};
  }
  const genericTeamsRole = guild.roles.cache.map(role => role).filter(role => role.name === "Teams");

  return roleAssign(genericTeamsRole, members)
  .then(({error, response}) => {
    if(error){
      throw {code: 500, message: `genericTeamsRole roleAssign failed with Error: ${error}`}
    }

    return roleAssign(teamRole, members)
  })
  .then(({error, response}) => {
    if(error){
      throw {code: 500, message: `teamRole roleAssign failed with Error: ${error}`}
    }

    return {error: null, response: `${response.name} assigned to ${members.join(', ')}`};
  })
  .catch((error) => {
    return {error, response: null}
  })
}