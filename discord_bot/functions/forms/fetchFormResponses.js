const axios = require('axios');
const { EmbedBuilder } = require('discord.js');
const configFile = require('../../config.json');
const { check } = require('./checkPermissions');
const { parse } = require('./parseFormResponses');
const { hold } = require('./holdFormResponses');
const { localisedLogging } = require('../../logging');

exports.fetch = async (roundNumber) => {
  logger = localisedLogging(new Error(), arguments, this)
  const apiPasskey = process.env.apiPasskey ? process.env.apiPasskey : configFile.apiPasskey
  const apiEndpoint = process.env.apiEndpoint ? process.env.apiEndpoint : configFile.apiEndpoint
  logger.info(`Using apiPasskey retrieved from ${process.env.apiPasskey ? "environment variable" : "config.json file"} and apiEndpoint retrieved from ${process.env.apiEndpoint ? "environment variable" : "config.json file"}`)
  const config = {
    headers: { Authorization: `Bearer ${apiPasskey}` }
  }

  return check()
  .then({error, response} => {
    if(error){ throw error }
    return axios.get(`${apiEndpoint}/responses/${roundNumber}`, config)
  })
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
        logger.error("Google Apps Script was not authorised to handle request - reAuth required.")
        return {error: {code: 403, message: `Google Apps Script re-authorisation required at: ${error.response.data.reAuth}`}, response: null}
      }
    }
    if(error.code === 409 && error.reason){
      logger.error(`${error.reason.replace("is", "was")} when called.`)
      return {error: {code: error.code, message: error.reason}, response: null}
    }
    logger.error({...error});
    return {error, response: null};
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