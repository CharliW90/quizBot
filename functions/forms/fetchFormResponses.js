const axios = require('axios');
const { apiEndpoint, apiPasskey } = require('../../config.json');

const { parse } = require('./parseFormResponses');
const { heldResponses } = require('./holdFormResponses');

module.exports = async (roundNumber) => {
  const config = {
    headers: { Authorization: `Bearer ${apiPasskey}` }
  }
  return axios.get(`${apiEndpoint}/responses/${roundNumber}`, config)
  .then(response => {
    if(response.data === undefined || response.data.length === 0){
      return []
    }

    if(response.data.length > 1){
      response.data.forEach((round) => {
        parse(round, true)
      })
      return heldResponses();
    } else {
      parse(response.data[0], true);
      return heldResponses(roundNumber);
    }
  })
  .then(embeds => {
    return embeds
  })
  .catch(error => {
    console.error(error);
    return Promise.reject(error);
  })
};
