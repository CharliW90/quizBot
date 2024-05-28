const { channelFromTeam, lookupAlias } = require("../maps/teamChannels");

const channelsCache = {}

exports.sendResponses = (heldResponse, teamName = null) => {
  try{
    if(!heldResponse || !heldResponse.embeds || heldResponse.constructor !== Object){
      const error = {"message": `held responses were ${JSON.stringify(heldResponse)}`, "code": 400, "loc": "sendFormResponses.js/sendResponses()"};
      return {error, response: null};
    }
      // if we are trying to only send one team's responses
      if(teamName){
        let lookup = teamName.toLowerCase();
        ({error, response} = lookupAlias(teamName))
        if(response) {
          lookup = response;
        } else if(error && error.code !== 404) {
          const newError = {"message": `ERR: "${error.code}:${error.message}" from channelFromTeam()`, "code": 500, "loc": "sendFormResponses.js/sendResponses()/parseAllTeams()"};
          throw {error: newError, response: null};
        }

        ({error, response} = parseSingleTeam(heldResponse, lookup));
        if(error){
          return {error, response};
        }
        return {error: null, response};
      } else {
        // we are trying to send all teams responses
        ({error, response} = parseAllTeams(heldResponse));
        if(error){
          return {error, response};
        }
        return {error: null, response};
      }
  } catch(e) {
    return e;
  }
}

const parseSingleTeam = ({teams, embeds}, lookup) => {
  const output = {successes: [], failures: []}
  if(teams.includes(lookup)){
    const teamEmbed = embeds.filter((embed) => { return embed.data.title.toLowerCase() === lookup});
    if(!channelsCache[lookup]){
      const result = channelFromTeam(lookup);
      channelsCache[lookup] = result;
    }
    const {error, response} = channelsCache[lookup];
    if(error && error.code !== 404) {
      const newError = {"message": `ERR: "${error.code}:${error.message}" from channelFromTeam()`, "code": 500, "loc": "sendFormResponses.js/sendResponses()/parseAllTeams()"};
      throw {error: newError, response: null};
    } else if(error){
      output.failures.push(lookup);
    } else if(response){
      response.send(teamEmbed);
      output.successes.push(lookup);
    } else {
      const newError = {"message": `fetching channel from team did not result in an {error, response} response`, "code": 500, "loc": "sendFormResponses.js/sendResponses()/parseSingleTeam()"};
      throw {error: newError, response: null}
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
    let lookup = team.toLowerCase();
    ({error, response} = lookupAlias(team));
    if(response){
      lookup = response;
    } else if(error && error.code !== 404){
      const newError = {"message": `ERR: "${error.code}:${error.message}" from channelFromTeam()`, "code": 500, "loc": "sendFormResponses.js/sendResponses()/parseAllTeams()"};
      throw {error: newError, response: null};
    }

    if(!channelsCache[lookup]){
      const result = channelFromTeam(lookup);
      channelsCache[lookup] = result;
    }
    ({error, response} = channelsCache[lookup]);
    if(error && error.code !== 404) {
      const newError = {"message": `ERR: "${error.code}:${error.message}" from channelFromTeam()`, "code": 500, "loc": "sendFormResponses.js/sendResponses()/parseAllTeams()"};
      throw {error: newError, response: null};
    } else if(error) {
      output.failures.push(lookup);
    } else if(response){
      response.send(embed);
      output.successes.push(lookup);
    } else {
      const newError = {"message": `fetching channel from team did not result in an {error, response} response`, "code": 500, "loc": "sendFormResponses.js/sendResponses()/parseAllTeams()"};
      throw {error: newError, response: null};
    }
  })
  return {error: null, response: output};
}