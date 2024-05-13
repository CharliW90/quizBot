const axios = require('axios');
const { apiEndpoint, apiPasskey } = require('../../config.json');
const { parse } = require('./parseFormResponses');

module.exports = async (roundNumber) => {
  const config = {
    headers: { Authorization: `Bearer ${apiPasskey}` }
  }
  return axios.get(`${apiEndpoint}/responses/${roundNumber}`, config)
  .then(response => {
    return parse(response.data)
  })
  .then(embeds => {
    return embeds
  }) //req.query.formId
  .catch(error => {
    console.error(error)
  })
};
