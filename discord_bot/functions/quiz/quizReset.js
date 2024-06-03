const { findCategoryChannel } = require("../../functions/discord");
const { resetTeamChannels } = require("../maps/teamChannels");
const { resetTeamMembers } = require("../maps/teamMembers");
const clearTeamCaptains = require("./clearTeamCaptains");

module.exports = (guild) => {
  if(!guild){
    const error = {"code": 400, "message": `Guild was ${guild}`};
    console.error(error);
    return {error, response: null};
  }
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
    return Promise.all([resetTeamChannels(), resetTeamMembers()])
  })
  .then(([channelResets, memberResets]) => {
    const resets = [...channelResets, ...memberResets];
    if(resets.length > 0){
      deletions["Internal Mapping"] = resets;
    }
    return clearTeamCaptains(guild);
  })
  .then(({error, response}) => {
    if(error){
      deletions["Reset Team Captain Role Failed"] = [true];
    } else {
      if(response.length > 0){
        deletions["Removed Captain Role from member"] = response;
      }
    }
    
    return {error: null, response: deletions};
  })
  .catch((error) => {
    return {error, response: null};
  })
}