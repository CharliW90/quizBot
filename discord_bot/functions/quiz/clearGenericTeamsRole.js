const { findRole } = require("../discord");

module.exports = async (guild) => {
  const genericTeamsRole = findRole(guild, "Teams").response;
  const members = await guild.members.fetch();
  const membersOfTeams = members.filter(member => member.roles.cache.has(genericTeamsRole.id));
  const removals = []
  try{
    membersOfTeams.forEach((member) => {
      removals.push(member.user.globalName);
      member.roles.remove(genericTeamsRole);
    })
    return {error: null, response: removals};
  } catch(error){
    return {error, response: null};
  }
}