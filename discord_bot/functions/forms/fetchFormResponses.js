const axios = require('axios');
const { apiEndpoint, apiPasskey } = require('../../config.json');

const { parse } = require('./parseFormResponses');
const { heldResponses } = require('./holdFormResponses');

exports.fetch = async (roundNumber) => {
  const config = {
    headers: { Authorization: `Bearer ${apiPasskey}` }
  }
  return axios.get(`${apiEndpoint}/responses/${roundNumber}`, config)
  .then(res => {
    if(res.data === undefined || res.data.length < 1){
      throw {"message": `forms API response was ${JSON.stringify(res.data)}`, "code": 404, "loc": "fetchFormResponses.js/fetch():response"}
    }

    if(res.data.length > 1){
      res.data.forEach((round) => {
        const {error, response} = parse(round, true);
        if(error){ throw error }
      })
      return heldResponses();
    }

    const {error, response} = parse(res.data[0], true);
    if(error){ throw error }
    return heldResponses(roundNumber);
  })
  .then(({error, response}) => {
    if(error){ throw error }
    return {error: null, response};
  })
  .catch(error => {
    console.error(error);
    return {error, response: null};
  })
};
