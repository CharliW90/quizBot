const { quizbot } = require('../config.json');
const logging = require('./logger.js');

const logger = logging.logger("engine")

exports.startup = () => {
  try {
    if (!quizbot) {
      logger.error(`quizbot is ${quizbot}`);
      throw new Error(`QuizBot undefined in config.}`);
    }

    if (quizbot.engine == undefined) {
      logger.error("QuizBot Engine is undefined");
      throw new Error(`QuizBot Engine undefined in config:${quizbot}`);
    }

    const { engine } = quizbot;

    const requiredKeys = ["instance", "project", "zone"]
    const engineKeys = Object.keys(engine)
    const missingKeys = []
    for(eachKey of requiredKeys){
      if(!engineKeys.includes(eachKey)){
        missingKeys.push(eachKey)
      }
    }

    if (missingKeys.length > 0) {
      const message = `QuizBot Engine missing keys: ${missingKeys.join(", ")}`
      logger.error(message)
      throw new Error(message)
    }

    return engine
  } catch(error){
    logger.error(error)
    throw error
  }
}