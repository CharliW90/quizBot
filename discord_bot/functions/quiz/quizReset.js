const { findCategoryChannel } = require("../../functions/discord");
const { reset } = require("../firestore");
const clearTeamCaptains = require("./clearTeamCaptains");

module.exports = (guild, blame) => {
  if(!guild){
    const error = {code: 400, message: `Guild was ${guild}`};
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
    return reset(guild.id, blame)
  })
  .then(({error, response}) => {
    if(error){
      console.info("Firestore reset returned error:\n", error)
    } else  {
      if(response.mappings.length > 0){
        deletions["Firestore Mapping"] = response.mappings;
      }
      if(response.teams.length > 0){
        deletions["Firestore Team Registrations"] = response.teams;
      }
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