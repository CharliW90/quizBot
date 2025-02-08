const axios = require('axios');
const { apiEndpoint, apiPasskey } = require('../../config.json');
const { localisedLogging } = require('../../logging');

exports.check = async () => {
  logger = localisedLogging(new Error(), arguments, this)
  // v4 - this feature becomes redundant - deprecate the whole thing eventually - short term implement a little check here?
  const config = {
    headers: { Authorization: `Bearer ${apiPasskey}` }
  }
  return axios.get(`${apiEndpoint}/permissions`, config)
  .then(res => {
    if(res.status === 200 && res.data){
      if(res.data.code === 200 && res.data.message === 'Adequate permissions.'){
        logger.info("PASS")
      } else {
        logger.info(res.data, "<<< res.data")
      }
    } else {
      logger.warn(res, "<<< res")
    }
    return {error: null, response: "Google Apps Script has sufficient permissions."}
  })
  .catch(error => {
    if(error.response){
      if(error.response.status === 403 && error.response.data){
        return {error: {code: 403, message: `Google Apps Script re-authorisation required at: ${error.response.data.reAuth}`}, response: null}
      }
    }
    logger.error({...error});
    return {error, response: null};
  })
}
