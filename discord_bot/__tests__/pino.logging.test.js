const { localisedLogging } = require("../logging")

describe('pino logger', () => {
  describe('test logger info', () => {
    test('redacts sensitive information', () => {
      const sensitiveInfo = require("../config.json");
      const logger = localisedLogging(new Error(), arguments, { category: "test", data: "test", execute: "execute(test)", autocomplete: "autocomplete(test)" });
      logger.info(sensitiveInfo);
      //upgraded console spy needed
    })
  })
})