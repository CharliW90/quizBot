const axios = require('axios');
const { apiEndpoint, apiPasskey } = require('../../config.json');

const { parse } = require('./parseFormResponses');
const { heldResponses } = require('./holdFormResponses');

exports.fetch = async (roundNumber) => {
  const config = {
    headers: { Authorization: `Bearer ${apiPasskey}` }
  }
  return axios.get(`${apiEndpoint}/responses/${roundNumber}`, config)
  .then(response => {
    if(response.data === undefined || response.data.length < 1){
      throw {"message": `forms API response was ${JSON.stringify(response.data)}`, "code": 404, "loc": "fetchFormResponses.js/fetch():response"}
    }

    if(response.data.length > 1){
      response.data.forEach((round) => {
        const parsedRound = parse(round, true);
        const [err, data] = parsedRound;
        if(err){
          throw err;
        }
      })
      return heldResponses();
    }

    const parsedRound = parse(response.data[0], true);
    const [err, data] = parsedRound;
    if(err){
      throw err;
    }
    return heldResponses(roundNumber);
  })
  .then(([err, embeds]) => {
    if(err){
      throw {...err, "loc": "fetchFormResponses.js/fetch():embeds"};
    }
    return [null, embeds];
  })
  .catch(error => {
    console.error(error);
    return [error, null];
  })
};
