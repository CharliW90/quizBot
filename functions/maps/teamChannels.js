const teamsChannels = {};
const channelsTeams ={};
const teamsAliases = new Map();

exports.registerTeamChannel = (teamName, channel) => {
  if(teamName && channel){
    if(!teamsChannels[teamName.toLowerCase()]){
      teamsChannels[teamName.toLowerCase()] = channel;
      channelsTeams[channel.id] = teamName.toLowerCase();
      if(teamsChannels[teamName.toLowerCase()] && channelsTeams[channel.id]){
        return [null, `${teamName}::${channel.id}`]
      } else {
        const details = {
          "teamsChannels": [teamsChannels[teamName.toLowerCase()], teamsChannels],
          "channelsTeams": [channelsTeams[channel.id], channelsTeams]
        }
        return [{"code": 500, "message": `Error handling storage of name: ${teamName} or channel: ${channel.id}`, details}, null]
      }
    } else {
      const registered = teamsChannels[teamName.toLowerCase()];
      return [{"code": 409, "message": `${teamName} already linked to ${registered.id}`}, null];
    }
  } else {
    return [{"code": 400, "message": `Team Name was ${teamName}, Channel was ${channel}`}, null];
  }
}

exports.setAlias = (alias, teamName, overwrite = false) => {
  if(alias && teamName){
    const channel = teamsChannels[teamName.toLowerCase()];
    if(channel){
      if(teamsAliases.has(alias) && !overwrite){
        return [{"code": 405, "message": `${alias} already links to a team name`}, null]
      }
      teamsAliases.set(alias, teamName.toLowerCase());
      if(teamsAliases.has(alias)){
        return [null, `${alias}::${teamName}::${channel.id}`]
      } else {
        return [{"code": 500, "message": `Error handling alias: ${alias} or team name: ${teamName}`}, null]
      }
    } else {
      return [{"code": 404, "message": `No team registered as ${teamName}`}, null]
    }
  } else {
    return [{"code": 400, "message": `Alias was ${alias}, Team Name was ${teamName}`}, null];
  }
  
}

exports.deleteTeam = (teamName) => {
  if(teamName){
    const lookup = teamsChannels[teamName.toLowerCase()] ? teamName.toLowerCase() : teamsAliases.get(teamName);
    // first finds and deletes the teamsChannels mapping (there should only be one, regardless of whether it is found via an alias or not)
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
    } else {
      return [{"code": 404, "message": `${teamName} not found`}, null];
    }
  } else {
    return [{"code": 400, "message": `Team Name was ${teamName}`}, null];
  }
}

exports.channelFromTeam = (teamName) => {
  if(teamName){
    const lookup = teamsChannels[teamName.toLowerCase()] ? teamName.toLowerCase() : teamsAliases.get(teamName);
    return teamsChannels[lookup] ? [null, teamsChannels[lookup]] : [{"code": 404, "message": `${teamName} not found`}, null];
  } else {
    return [{"code": 400, "message": `Team Name was ${teamName}`}, null];
  }
}

exports.teamFromChannel = (channel) => {
  if(channel && channel.id){
    const lookup = channel.id;
    return channelsTeams[lookup] ? [null, channelsTeams[lookup]] : [{"code": 404, "message": `Channel ${channel.id} not found`}, null];
  } else {
    return channel ? [{"code": 400, "message": `Channel ID was ${channel.id}`}, null] : [{"code": 400, "message": `Channel was ${channel}`}, null];
  }
}