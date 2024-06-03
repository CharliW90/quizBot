const { findRole } = require("../discord");

module.exports = async (guild) => {
  const captainRole = findRole(guild, "Team Captain").response;
  const members = await guild.members.fetch();
  const captains = members.filter(member => member.roles.cache.has(captainRole.id));
  const removals = []
  try{
    captains.forEach((member) => {
      removals.push(member.user.globalName);
      member.roles.remove(captainRole);
    })
    return {error: null, response: removals};
  } catch(error){
    return {error, response: null};
  }
}