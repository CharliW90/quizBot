const teamsChannels = {};

exports.registerTeam = (teamName, channel) => {
  teamsChannels[teamName] = channel;
}

const teamsAliases = {};

exports.setAlias = (alias, teamName) => {
  teamsAliases[alias] = teamName;
}

exports.channelFromTeam = (teamName) => {
  const lookup = teamsChannels[teamName] ? teamName : teamsAliases[teamName]
  if(teamsChannels[lookup]){
    return teamsChannels[lookup];
  } else {
    return null;
  }
}

exports.teamFromChannel = (channel) => {
  const teams = Object.keys(teamsChannels)
  const team = teams.filter((team) => {return teamsChannels[team] === channel});
  return team[0];
}