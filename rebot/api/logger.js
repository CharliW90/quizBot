/**
 * Creating a placeholder custom logger here, in case we wish to add pino logging later
 */
exports.logger = (location) => {
  return {
    location,
    info: function (message) {
      console.info(`INFO [API:${this.location}]: ${message}`)
    },
    error: function (message) {
      console.error(`ERROR [API:${this.location}]: ${message}`)
    },
    warn: function (message) {
      console.warn(`WARN [API:${this.location}]: ${message}`)
    }
  }
} 