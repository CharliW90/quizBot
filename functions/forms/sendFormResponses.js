const { channelFromTeam, lookupAlias } = require("../maps/teamChannels");

exports.sendResponses = async (heldResponses, teamName = null) => {
  if(!heldResponses){
    const error = {"message": `held responses were ${heldResponses}`, "code": 400, "loc": "sendFormResponses.js/sendResponses()"};
    return {error, response: null};
  }
  const outputs = [];
  heldResponses.forEach((heldResponse) => {
    if(teamName){
      const lookup = lookupAlias(teamName).error.code === 404 ? teamName.toLowerCase() : lookupAlias(teamName).response;
      const {error, response} = parseSingleTeam(heldResponse, lookup);
      if(error){
        return {error, response};
      }
      outputs.push(response)
    } else {
      const {error, response} = parseAllTeams(heldResponse);
      if(error){
        return {error, response};
      }
      outputs.push(response);
    }
  })
  return outputs;
}

const parseSingleTeam = ({teams, embeds}, lookup) => {
  const output = {successes: [], failures: []}
  if(teams.includes(lookup)){
    const teamEmbed = embeds.filter((embed) => { return embed.data.title.toLowerCase() === lookup});
    const {error, response} = channelFromTeam(lookup)
    if(error){
      output.failures.push(lookup);
    } else if(response){
      response.send(teamEmbed);
      output.successes.push(lookup);
    } else {
      const error = {"message": `fetching channel from team resulted in neither error nor response`, "code": 500, "loc": "sendFormResponses.js/sendResponses()/parseSingleTeam()"};
      return {error, response: null}
    }
  } else {
    const error = {"message": `${teams.join(', ')}does not include ${lookup}`, "code": 404, "loc": "sendFormResponses.js/sendResponses()/parseSingleTeam()"};
    return {error, response: null};
  }
  return {error: null, response: output};
}

const parseAllTeams = ({embeds}) => {
  const output = {successes: [], failures: []};
  embeds.forEach((embed) => {
    const team = embed.data.title;
    const {error, response} = channelFromTeam(team);
    if(error){
      output.failures.push(team);
    } else if(response){
      response.send(embed);
      output.successes.push(team);
    } else {
      const error = {"message": `fetching channel from team resulted in neither error nor response`, "code": 500, "loc": "sendFormResponses.js/sendResponses()/parseAllTeams()"};
      return {error, response: null};
    }
  })
  return {error: null, response: output};
}