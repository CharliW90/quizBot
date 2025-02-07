const { findCategoryChannel } = require("../../functions/discord");
const { localisedLogging } = require("../../logging");
const { reset } = require("../firestore");
const clearGenericTeamsRole = require("./clearGenericTeamsRole");
const clearTeamCaptains = require("./clearTeamCaptains");

module.exports = (guild, blame='unknown') => {
  const logger = localisedLogging(new Error(), arguments, this)
  logger.debug({guild, blame});
  if(!guild){
    const error = {code: 400, message: `Guild was ${guild}`};
    return {error, response: null};
  }
  const deletions = {};
  const teamChannels = findCategoryChannel(guild, 'QUIZ TEAMS');

  const channelDeleteRequests = []
  teamChannels.response.children.cache.forEach((channel) => {
    channelDeleteRequests.push(channel.delete())
  });
  logger.debug({channelDeleteRequests, deletions})

  return Promise.all(channelDeleteRequests)
  .then((deletedChannels) => {
    logger.debug({deletedChannels, deletions})
    deletedChannels.forEach((channel) => {
      if(!deletions[channel.constructor.name]){
        deletions[channel.constructor.name] = []
      }
      deletions[channel.constructor.name].push(channel.name);
    })
    
    const roleDeleteRequests = [];
    const teamRoles = guild.roles.cache.filter(role => role.name.split(' ')[0] === "Team:");
    teamRoles.forEach((role) => {
      roleDeleteRequests.push(role.delete())
    })
    logger.debug({roleDeleteRequests, deletions})

    return Promise.all(roleDeleteRequests);  
  })
  .then((deletedRoles) => {
    logger.debug({deletedRoles})
    deletedRoles.forEach((role) => {
      if(!deletions[role.constructor.name]){
        deletions[role.constructor.name] = []
      }
      deletions[role.constructor.name].push(role.name.replace("Team: ", ""));
    })
    return reset(guild.id, blame)
  })
  .then(({error, response}) => {
    logger.debug({error, response, deletions})
    if(error){
      logger.info(`Firestore reset returned error:\n${JSON.stringify(error)}`)
    } else  {
      if(response.mappings.length > 0){
        deletions["Firestore Mapping"] = response.mappings;
      }
      if(response.teams.length > 0){
        deletions["Firestore Team Registration"] = response.teams;
      }
    }
    
    return clearTeamCaptains(guild);
  })
  .then(({error, response}) => {
    logger.debug({error, response, deletions})
    if(error){
      logger.debug(`Reset Team Captain Role returned error:\n${JSON.stringify(error)}`)
      deletions["Reset Team Captain Role Failed"] = [true];
    } else {
      if(response.length > 0){
        deletions["Captain Role"] = response;
      }
    }
    return clearGenericTeamsRole(guild);
  })
  .then(({error, response}) => {
    logger.debug({error, response, deletions})
    if(error){
      logger.debug(`Reset Generic Teams Role returned error:\n${JSON.stringify(error)}`)
      deletions["Reset Generic Teams Role Failed"] = [true];
    } else {
      if(response.length > 0){
        deletions["Generic Teams Role"] = response;
      }
    }
    logger.debug({success: true, deletions})
    return {error: null, response: deletions};
  })
  .catch((error) => {
    logger.debug({success: false, deletions, error})
    return {error, response: null};
  })
}