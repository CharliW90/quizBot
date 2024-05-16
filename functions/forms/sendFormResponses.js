const { channelFromTeam } = require("../maps/teamChannels");

module.exports = async (heldResponses, teamName = null) => {
  const responses = [];
  heldResponses.forEach((heldResponse) => {
    const {teams, embeds} = heldResponse;
    const response = {successes: [], failures: []}
    if(teamName){
      if(teams.includes(teamName.toLowerCase())){
        const teamEmbed = embeds.filter((embed) => { return embed.data.title.toLowerCase() === teamName.toLowerCase()});
        const channel = channelFromTeam(teamName)
        if(channel){
          channel.send(teamEmbed);
          response.successes.push(teamName);
        } else {
          response.failures.push(teamName);
        }
      } else {
        const errMsg = `${teams.join(', ')}does not include ${teamName}`
        console.warn(errMsg)
        // throw new Error({code: 404, message: errMsg})
      }
    } else {
      // handle all teams
      embeds.forEach((embed) => {
        const team = embed.data.title;
        const channel = channelFromTeam(team)
        if(channel){
          channel.send(embed);
          response.successes.push(team);
        } else {
          response.failures.push(team);
        }
      })
    }
    responses.push(response);
  })
  return responses;
}