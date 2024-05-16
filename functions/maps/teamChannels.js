const teamsChannels = {};

exports.registerTeam = (teamName, channel) => {
  teamsChannels[teamName.toLowerCase()] = channel;
}

exports.deleteTeam = (teamName) => {
  if(teamsChannels[teamName.toLowerCase()]){
    delete teamsChannels[teamName.toLowerCase()]
    return teamName;
  } else {
    return null;
  }
}

const teamsAliases = {};

exports.setAlias = (alias, teamName) => {
  teamsAliases[alias] = teamName.toLowerCase();
}

exports.channelFromTeam = (teamName) => {
  const lookup = teamsChannels[teamName.toLowerCase()] ? teamName.toLowerCase() : teamsAliases[teamName] 
  return teamsChannels[lookup] ? teamsChannels[lookup] : null;
}

exports.teamFromChannel = (channel) => {
  const teams = Object.keys(teamsChannels)
  const team = teams.filter((team) => {return teamsChannels[team] === channel});
  return team[0];
}