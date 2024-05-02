const axios = require('axios')

const instance = axios.create({
  maxRedirects: 5,
});

module.exports = instance;