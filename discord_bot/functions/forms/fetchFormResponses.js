const axios = require('axios');
const { EmbedBuilder } = require('discord.js');
const { apiEndpoint, apiPasskey } = require('../../config.json');
const { parse } = require('./parseFormResponses');
const { hold } = require('./holdFormResponses');

exports.fetch = async (roundNumber) => {
  const config = {
    headers: { Authorization: `Bearer ${apiPasskey}` }
  }
  return axios.get(`${apiEndpoint}/responses/${roundNumber}`, config)
  .then(res => {
    if(res.data === undefined || res.data.length < 1){
      throw {message: `forms API response was ${JSON.stringify(res.data)}`, code: 404, loc: "fetchFormResponses.js/fetch():response"}
    }
    const promiseToHold = [];
    res.data.forEach((round) => {
      const {error, response} = parse(round);
      if(error){ throw error }
      promiseToHold.push(hold(response.roundNum, response.embedMessages, response.teams));
    })
    return Promise.all(promiseToHold)
  })
  .then((held) => {
    const responses = [];
    held.forEach(({error, response}) => {
      if(error){ throw error };
      responses.push(response);
    })
    return {error: null, response: responses};
  })
  .catch(error => {
    if(error.response){
      if(error.response.status === 403 && error.response.data){
        return {error: {code: 403, message: `Google Apps Script re-authorisation required at: ${error.response.data.reAuth}`}, response: null}
      } else {
        console.error(error);
        return {error, response: null};
      }
    } else {
      console.error(error);
      return {error, response: null};
    }
  })
};

exports.summarise = async (data) => {
  if(!data || data.length === 0){
    return {error: `No data: ${data}`, response: null};
  }
  if(data.length > 1){
    data.reverse();
  }
  const summaryMessage = new EmbedBuilder()
    .setColor('e511c7')
    .setTitle("Responses Fetched")
    .setAuthor({name: `Virtual Quizzes Response Handler`, iconURL: 'https://cdn.discordapp.com/attachments/633012685902053397/1239617146548519014/icon.png', url: 'https://www.virtual-quiz.co.uk/'})
    .addFields({name: "Rounds Fetched", value: `${data.length}`})

  data.forEach((round) => {
    summaryMessage.addFields(
      {name: `Responses for Quiz Round ${round.roundNum}`, value: round.teams.sort().join('\n')}
    )
  })
  
  return {error: null, response: summaryMessage};
}