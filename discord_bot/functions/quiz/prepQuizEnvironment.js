const {createCategoryChannel, createRole, findCategoryChannel, findRole} = require('../discord')

module.exports = (client, guild = null) => {
  if(!guild){
    const guilds = client.guilds.cache;
    const actions = []
    guilds.forEach((clientGuild) => {
      const responses = prepGuild(clientGuild);
      responses.forEach((response) => {actions.push(response)})
    })
    return {error: null, response: actions}
  } else {
    const actions = prepGuild(guild);
    return {error: null, response: actions};
  }
  
}

const prepGuild = (guild) => {
  const actions = [];
  let {error, response} = findCategoryChannel(guild, "QUIZ TEAMS");
  if(error){
    createCategoryChannel(guild, {name: "QUIZ TEAMS"});
    actions.push(`Created category channel 'QUIZ TEAMS' for Server: ${guild.name}`);
  }
  ({error, response} = findRole(guild, "Team Captain"));
  if(error){
    const self = findRole(guild, "Quizzy");
    const roleDetails = {
      name: "Team Captain",
      color: "Purple",
      hoist: true,
      position: self.position,
      mentionable: true,
    }
    createRole(guild, roleDetails)
    actions.push(`Created 'Team Captain' role for Server: ${guild.name}`)
  }
  return actions;
}