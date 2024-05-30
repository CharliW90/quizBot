const { findCategoryChannel } = require("../../functions/discord");

module.exports = (guild) => {
  const deletions = {};
  const teamChannels = findCategoryChannel(guild, 'QUIZ TEAMS');

  const channelDeleteRequests = []
  teamChannels.response.children.cache.forEach((channel) => {
    channelDeleteRequests.push(channel.delete())
  });

  return Promise.all(channelDeleteRequests)
  .then((deletedChannels) => {
    deletedChannels.forEach((channel) => {
      if(!deletions[channel.constructor.name]){
        deletions[channel.constructor.name] = []
      }
      deletions[channel.constructor.name].push(channel.name);
    })
    
    const roleDeleteRequests = [];
    const teamRoles = guild.roles.cache.map(role => role).filter(role => role.name.split(' ')[0] === "Team:");
    teamRoles.forEach((role) => {
      roleDeleteRequests.push(role.delete())
    })

    return Promise.all(roleDeleteRequests);  
  })
  .then((deletedRoles) => {
    deletedRoles.forEach((role) => {
      if(!deletions[role.constructor.name]){
        deletions[role.constructor.name] = []
      }
      deletions[role.constructor.name].push(role.name.replace("Team: ", ""));
    })

    return {error: null, response: deletions};
  })
  .catch((error) => {
    return {error, response: null};
  })
}