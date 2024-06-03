const teamsChannels = new Map();
const channelsTeams = new Map();
const teamsAliases = new Map();

exports.registerTeamChannel = (teamName, channel) => {

  if(!teamName || !channel){
    const error = {"code": 400, "message": `Team Name was ${teamName}, Channel was ${channel}`};
    return {error, response: null};
  }

  if(!this.channelFromTeam(teamName).error){
    const error = {"code": 409, "message": `${teamName} already linked to a channel`};
    return {error, response: null};
  }

  if(!this.teamFromChannel(channel).error){
    const error = {"code": 409, "message": `${channel.name} already linked to a team`};
    return {error, response: null};
  }

  teamsChannels.set(teamName.toLowerCase(), channel);
  channelsTeams.set(channel, teamName.toLowerCase());

  if(teamsChannels.has(teamName.toLowerCase()) && channelsTeams.has(channel)){
    // if both are successfully listed in the respective Objects
    return {error: null, response: `${teamName}::${channel}`}
  } else {
    // return error message with additional details to help debug error
    const details = {
      "teamsChannels": [
        `attempted registration of ${teamName.toLowerCase()}`,
        teamsChannels.has(teamName.toLowerCase()),
        teamsChannels.get(teamName.toLowerCase()),
        teamsChannels
      ],
      "channelsTeams": [
        `attempted registration of ${channel.name}`,
        channelsTeams.has(channel),
        channelsTeams.get(channel),
        channelsTeams
      ]
    }
    const error = {"code": 500, "message": `Error handling storage of name: ${teamName} or channel: ${channel.id}`, details};
    return {error, response: null};
  }
}

exports.setAlias = (alias, teamName, overwrite = false) => {
  if(!alias || !teamName){
    const error = {"code": 400, "message": `Alias was ${alias}, Team Name was ${teamName}`};
    return {error, response: null};
  }

  if(this.channelFromTeam(teamName).error) {
    const error = {"code": 404, "message": `No team registered as ${teamName}`};
    return {error, response: null};
  }

  if(teamsAliases.has(alias) && !overwrite){
    const error = {"code": 405, "message": `${alias} already links to a team name`};
    return {error, response: null};
  }

  teamsAliases.set(alias, teamName.toLowerCase());

  if(teamsAliases.has(alias)){
    // if registered successfully in the Map
    return {error: null, response: `${alias}::${teamName}::${this.channelFromTeam(teamName).response.id}`}
  } else {
    // return error message with additional details to help debug error
    const details = {
      "aliases": [
        `attempted registration of ${alias} against ${teamName}`,
        teamsAliases
      ]
    };
    const error = {"code": 500, "message": `Error handling alias: ${alias} or team name: ${teamName}`, details};
    return {error, response: null};
  }
}

exports.lookupAlias = (alias) => {
  if(!alias){
    const error = {"code": 400, "message": `Alias was ${alias}`, "loc": "teamChannels.js/lookupAlias()"};
    return {error, response: null};
  }
  if(teamsAliases.has(alias)){
    return {error: null, response: teamsAliases.get(alias)}
  } else {
    return {error: {"message": "not an alias", "code": 404, "loc": "teamChannels.js/lookupAlias()"}, response: null}
  }
}

exports.deleteTeam = (teamName) => {
  if(!teamName) {
    const error = {"code": 400, "message": `Team Name was ${teamName}`};
    return {error, response: null};
  }

  if(this.channelFromTeam(teamName).error) {
    const error = {"code": 404, "message": `${teamName} not found`};
    return {error, response: null};
  }

  const lookup = teamsChannels.has(teamName.toLowerCase()) ? teamName.toLowerCase() : teamsAliases.get(teamName);

  const channel = teamsChannels.get(lookup);
  teamsChannels.delete(lookup);
  channelsTeams.delete(channel);
  
  let response = lookup;

  teamsAliases.forEach((team, alias) => {
    if(team === lookup){
      teamsAliases.delete(alias);
      response += `, ${alias}`;
    }
  })

  return {error: null, response}
}

exports.channelFromTeam = (teamName) => {
  
  if(!teamName){
    const error = {"code": 400, "message": `Team Name was ${teamName}`};
    return {error, response: null}
  }

  const lookup = teamsChannels.has(teamName.replace("Team: ", "").toLowerCase()) ? teamName.replace("Team: ", "").toLowerCase() : teamsAliases.get(teamName.replace("Team: ", ""));
  
  return teamsChannels.has(lookup) ? {error: null, response: teamsChannels.get(lookup)} : {error: {"code": 404, "message": `${teamName} not found when looking up channelFromTeam()`}, response: null};
}

exports.teamFromChannel = (channel) => {
  if(!channel || !channel.id || !channel.name){
    return channel ? {error: {"code": 400, "message": `Bad Channel id: ${channel.id}, or name: ${channel.name}`}, response: null} : {error: {"code": 400, "message": `Channel was ${channel}`}, response: null};
  }
  
  return channelsTeams.has(channel) ? {error: null, response: channelsTeams.get(channel)} : {error: {"code": 404, "message": `Channel ${channel.name} not found when looking up teamFromChannel()`}, response: null};
}

exports.resetTeamChannels = () => {
  const resets = [...teamsChannels.keys(), ...channelsTeams.keys(), ...teamsAliases.keys()];
  teamsChannels.clear();
  channelsTeams.clear();
  teamsAliases.clear();
  if(teamsChannels.size + channelsTeams.size + teamsAliases.size === 0){
    return resets;
  }
  return []
}