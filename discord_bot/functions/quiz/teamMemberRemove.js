const { roleRemove, findRole } = require("../discord");

module.exports = (guild, teamRole, members) => {
  if(!teamRole || !members || members.length < 1){
    const error = {code: 400, message: `Role was ${teamRole}, Members were ${members}`};
    console.error(error);
    return {error, response: null};
  }
  const genericTeamsRole = findRole(guild, "Teams")

  return roleRemove(genericTeamsRole.response, members)
  .then(({error, response}) => {
    if(error){
      throw {code: 500, message: `genericTeamsRole roleRemove failed with Error: ${error}`}
    }

    return roleRemove(teamRole, members)
  })
  .then(({error, response}) => {
    if(error){
      throw {code: 500, message: `teamRole roleRemove failed with Error: ${error}`}
    }
    return {error: null, response: `${response.role} removed from ${members.join(', ')}`};
  })
  .catch((error) => {
    return {error, response: null}
  })
}