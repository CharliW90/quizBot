const teamsChannels = {};
const channelsTeams ={};
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
    const error = {"code": 409, "message": `${channel.id} already linked to a team`};
    return {error, response: null};
  }

  teamsChannels[teamName.toLowerCase()] = channel;
  channelsTeams[channel.id] = teamName.toLowerCase();

  if(teamsChannels[teamName.toLowerCase()] && channelsTeams[channel.id]){
    // if both are successfully listed in the respective Objects
    return {error: null, response: `${teamName}::${channel.id}`}
  } else {
    // return error message with additional details to help debug error
    const details = {
      "teamsChannels": [
        `attempted registration of ${teamName.toLowerCase()}`,
        teamsChannels[teamName.toLowerCase()],
        teamsChannels
      ],
      "channelsTeams": [
        `attempted registration of ${channel.id}`,
        channelsTeams[channel.id],
        channelsTeams
      ]
    }
    const error = {"code": 500, "message": `Error handling storage of name: ${teamName} or channel: ${channel.id}`, details};
    return {error, response: null};
  }
}

exports.setAlias = (alias, teamName, overwrite = false) => {
  console.log(teamsChannels)
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

  const lookup = teamsChannels[teamName.toLowerCase()] ? teamName.toLowerCase() : teamsAliases.get(teamName);

  let response = lookup;

  const channel = teamsChannels[lookup];
  delete teamsChannels[lookup];
  delete channelsTeams[channel];

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

  const lookup = teamsChannels[teamName.toLowerCase()] ? teamName.toLowerCase() : teamsAliases.get(teamName);
  
  return teamsChannels[lookup] ? {error: null, response: teamsChannels[lookup]} : {error: {"code": 404, "message": `${teamName} not found`}, response: null};
}

exports.teamFromChannel = (channel) => {
  if(!channel || !channel.id){
    return channel ? {error: {"code": 400, "message": `Channel ID was ${channel.id}`}, response: null} : {error: {"code": 400, "message": `Channel was ${channel}`}, response: null};
  }
    
  const lookup = channel.id;
  
  return channelsTeams[lookup] ? {error: null, response: channelsTeams[lookup]} : {error: {"code": 404, "message": `Channel ${channel.id} not found`}, response: null};
}