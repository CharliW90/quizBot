const { Events, ActivityType } = require('discord.js');
const { localisedLogging } = require('../logger');
const prepQuizEnvironment = require('../functions/quiz/prepQuizEnvironment');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
    logger = localisedLogging(new Error(), arguments, this)
    client.user.setPresence({
      activities: [{ name: 'Virtual Quizzes', url: 'https://www.twitch.tv/jorosar', type: ActivityType.Streaming}],
      status: 'online'
    });
		logger.info(`Ready! Logged in as ${client.user.tag}`);
    const {error, response} = prepQuizEnvironment(client)
    logger.debug({msg: `prepQuizEnvironment(client):`, client, error, response})
    if(error){
      logger.error(error);
    }
    if(response.length > 0){
      response.forEach((actionTaken) => {
        logger.info(actionTaken);
      });
    } else {logger.debug({msg: `response.length = ${response.length}:`, response})}
	},
};