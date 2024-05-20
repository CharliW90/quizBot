const teamsChannels = {};
const channelsTeams ={};
const teamsAliases = new Map();

exports.registerTeamChannel = (teamName, channel) => {

  if(!teamName || !channel){
    return [{"code": 400, "message": `Team Name was ${teamName}, Channel was ${channel}`}, null];
  }

  if(this.channelFromTeam(teamName)[0] === null){
    // if error is null, teamName already associated with channel
    return [{"code": 409, "message": `${teamName} already linked to a channel`}, null];
  }

  if(this.teamFromChannel(channel)[0] === null){
    // if error is null, channel already associated with team
    return [{"code": 409, "message": `${channel.id} already linked to a team`}, null];
  }

  teamsChannels[teamName.toLowerCase()] = channel;
  channelsTeams[channel.id] = teamName.toLowerCase();

  if(teamsChannels[teamName.toLowerCase()] && channelsTeams[channel.id]){
    // if both are successfully listed in the respective Objects
    return [null, `${teamName}::${channel.id}`]
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
    return [{"code": 500, "message": `Error handling storage of name: ${teamName} or channel: ${channel.id}`, details}, null]
  }
}

exports.setAlias = (alias, teamName, overwrite = false) => {
  if(!alias || !teamName){
    return [{"code": 400, "message": `Alias was ${alias}, Team Name was ${teamName}`}, null];
  }

  if(this.channelFromTeam(teamName)[0] !== null) {
    // if error is returned, teamName hasn't been paired to a channel yet
    return [{"code": 404, "message": `No team registered as ${teamName}`}, null]
  }

  if(teamsAliases.has(alias) && !overwrite){
    // if alias already exists, and the overwrite option hasn't been declared
    return [{"code": 405, "message": `${alias} already links to a team name`}, null]
  }

  teamsAliases.set(alias, teamName.toLowerCase());

  if(teamsAliases.has(alias)){
    // if registered successfully in the Map
    return [null, `${alias}::${teamName}::${this.channelFromTeam(teamName)[1].id}`]
  } else {
    // return error message with additional details to help debug error
    const details = {
      "aliases": [
        `attempted registration of ${alias} against ${teamName}`,
        teamsAliases
      ]
    }
    return [{"code": 500, "message": `Error handling alias: ${alias} or team name: ${teamName}`, details}, null]
  }
}

exports.deleteTeam = (teamName) => {
  if(!teamName) {
    return [{"code": 400, "message": `Team Name was ${teamName}`}, null];
  }

  if(this.channelFromTeam(teamName)[0] !== null) {
    return [{"code": 404, "message": `${teamName} not found`}, null];
  }

  const lookup = teamsChannels[teamName.toLowerCase()] ? teamName.toLowerCase() : teamsAliases.get(teamName);

  if(teamsChannels[lookup]){
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

    return [null, response]
  }
}

exports.channelFromTeam = (teamName) => {
  if(!teamName){
    return [{"code": 400, "message": `Team Name was ${teamName}`}, null];
  }

  const lookup = teamsChannels[teamName.toLowerCase()] ? teamName.toLowerCase() : teamsAliases.get(teamName);
  
  return teamsChannels[lookup] ? [null, teamsChannels[lookup]] : [{"code": 404, "message": `${teamName} not found`}, null];
}

exports.teamFromChannel = (channel) => {
  if(!channel || !channel.id){
    return channel ? [{"code": 400, "message": `Channel ID was ${channel.id}`}, null] : [{"code": 400, "message": `Channel was ${channel}`}, null];
  }
    
  const lookup = channel.id;
  return channelsTeams[lookup] ? [null, channelsTeams[lookup]] : [{"code": 404, "message": `Channel ${channel.id} not found`}, null];
}